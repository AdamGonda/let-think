import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  useSessionData,
  type SessionMessage,
} from "../../contexts/SessionDataContext";
import {
  resolveAtReferences,
} from "../../lib/chatMentions";
import type { NumberedConcept } from "../../lib/conceptReferences";
import { useAppUiSelector } from "../../hooks/useAppUi";
import { ChatComposer } from "./ChatComposer";
import { HistoricalBatchPrompt } from "./HistoricalBatchPrompt";
import { snapshotCanvasJpeg } from "../../lib/canvasSnapshot";
import {
  EMPTY_IMAGE_USER_CONTENT,
  IMAGE_PROMPT_MAX,
  imageFilesToAdd,
  isAcceptedImageType,
  prepareImageBlob,
  uploadJpegToConvex,
} from "../../lib/imageAttach";

type PendingImage = { id: string; blob: Blob; previewUrl: string };

interface ChatProps {
  sessionId: Id<"sessions"> | null;
  chatSessionId?: Id<"chatSessions"> | null;
  onCreateSession?: () => Promise<Id<"sessions">>;
  onCreateChatSession?: () => Promise<Id<"chatSessions">>;
  autoCollapseSignal?: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean, chatSessionId?: Id<"chatSessions">) => void;
  numberedConcepts?: NumberedConcept[];
  draftInput?: string;
  setDraftInput?: (value: string) => void;
  sessionLoadingFrame?: boolean;
  sessionPastFrame?: boolean;
  /**
   * When set (non-latest graph batch), shows collapsed read-only prompt with history-style
   * mention rendering instead of the composer.
   */
  lockedHistorical?: Pick<SessionMessage, "content" | "mentions"> | null;
  /** Graph step index; used to reset historical prompt UI when navigating batches. */
  selectedBatchIndex: number;
  sendLane?: "graph" | "chat";
  autoFocus?: boolean;
  listenForFocusEvent?: boolean;
  /** Chat-lane send: graph `@n` highlights to drop after those refs were used. */
  onConsumedConceptNumbers?: (conceptNumbers: number[]) => void;
  fileId?: Id<"files"> | null;
}

export function Chat({
  sessionId,
  chatSessionId = null,
  onCreateSession,
  onCreateChatSession,
  autoCollapseSignal = "",
  isLoading,
  setIsLoading,
  numberedConcepts = [],
  draftInput,
  setDraftInput,
  sessionLoadingFrame = false,
  sessionPastFrame = false,
  lockedHistorical = null,
  selectedBatchIndex,
  sendLane = "graph",
  autoFocus = true,
  listenForFocusEvent = true,
  onConsumedConceptNumbers,
  fileId = null,
}: ChatProps) {
  const [internalInput, setInternalInput] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const pendingImagesRef = useRef(pendingImages);
  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  });
  const draft = draftInput !== undefined ? draftInput : internalInput;
  const setInput =
    setDraftInput !== undefined ? setDraftInput : setInternalInput;
  const input = draft;
  const sendGraphMessage = useAction(api.chat.send);
  const sendChatMessage = useAction(api.chat.sendChat);
  const updateFileNotes = useMutation(api.files.updateThinkingNotes);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);
  const notes = useAppUiSelector((s) => s.context.notes);
  const { canSend, setPendingChatUser } = useSessionData();
  const posthog = usePostHog();

  useEffect(() => {
    return () => {
      for (const img of pendingImagesRef.current) {
        URL.revokeObjectURL(img.previewUrl);
      }
    };
  }, []);

  const addImageFiles = async (files: File[]) => {
    const accepted = files.filter((file) => isAcceptedImageType(file.type));
    if (accepted.length === 0) {
      toast.error("Use JPEG, PNG, WebP, or GIF");
      return;
    }
    const selected = imageFilesToAdd(accepted, pendingImages.length);
    if (selected.length === 0) {
      toast.error("You can attach up to 4 images");
      return;
    }
    if (selected.length < accepted.length) {
      toast.error("You can attach up to 4 images");
    }
    const next: PendingImage[] = [];
    for (const file of selected) {
      try {
        const blob = await prepareImageBlob(file);
        next.push({
          id: crypto.randomUUID(),
          blob,
          previewUrl: URL.createObjectURL(blob),
        });
      } catch {
        toast.error("Couldn't attach that image");
      }
    }
    if (next.length === 0) return;
    setPendingImages((prev) => [...prev, ...next].slice(0, IMAGE_PROMPT_MAX));
  };

  const removeImage = (id: string) => {
    setPendingImages((prev) => {
      const found = prev.find((img) => img.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const collectImageStorageIds = async (
    extraBlob: Blob | null,
  ): Promise<Id<"_storage">[]> => {
    const blobs = [
      ...pendingImages.map((img) => img.blob),
      ...(extraBlob ? [extraBlob] : []),
    ];
    if (blobs.length > IMAGE_PROMPT_MAX) {
      throw new Error("You can attach up to 4 images");
    }
    const ids: Id<"_storage">[] = [];
    for (const blob of blobs) {
      const postUrl = await generateUploadUrl();
      ids.push(await uploadJpegToConvex(postUrl, blob));
    }
    return ids;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedHistorical) return;
    if (!input.trim() && pendingImages.length === 0) return;

    const rawContent = input.trim();
    const {
      resolvedContent,
      referencedConcepts,
      mentions,
      includeWriting,
      includeCanvas,
    } = resolveAtReferences(rawContent, numberedConcepts);
    const mentionPayload = mentions.length > 0 ? mentions : undefined;
    if (includeCanvas && pendingImages.length >= IMAGE_PROMPT_MAX) {
      toast.error("You can attach up to 4 images");
      return;
    }
    let canvasBlob: Blob | null = null;
    if (includeCanvas) {
      canvasBlob = await snapshotCanvasJpeg();
      if (!canvasBlob) {
        toast.error("Nothing on the canvas");
        return;
      }
    }
    if (includeWriting && fileId) {
      await updateFileNotes({ fileId, thinkingNotes: notes });
    }
    const selectedNodeContext =
      referencedConcepts.length > 0
        ? referencedConcepts.map(({ id, name, description }) => ({
            id,
            name,
            description,
          }))
        : undefined;

    let imageStorageIds: Id<"_storage">[] = [];
    try {
      imageStorageIds = await collectImageStorageIds(canvasBlob);
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error(
        err instanceof Error ? err.message : "Couldn't upload image",
      );
      return;
    }
    const userContent =
      resolvedContent.trim() ||
      (imageStorageIds.length > 0 ? EMPTY_IMAGE_USER_CONTENT : "");
    if (!userContent) return;
    const imagePayload =
      imageStorageIds.length > 0 ? imageStorageIds : undefined;

    if (sendLane === "chat") {
      if (sessionId && !canSend) return;

      const savedImages = pendingImages;
      setPendingChatUser({
        role: "user",
        content: userContent,
        mentions: mentionPayload,
        imageUrls: savedImages.map((img) => img.previewUrl),
      });
      setInput("");
      setPendingImages([]);
      let loadingForId = chatSessionId ?? null;
      if (loadingForId) setIsLoading(true, loadingForId);
      onConsumedConceptNumbers?.(
        referencedConcepts.map((c) => c.number),
      );

      const restoreDraft = () => {
        setPendingChatUser(null);
        setInput(rawContent);
        setPendingImages(savedImages);
        if (loadingForId) setIsLoading(false, loadingForId);
      };

      try {
        let effectiveSessionId = sessionId;
        const createdViaCallback = !sessionId && onCreateSession;
        if (!effectiveSessionId && onCreateSession) {
          effectiveSessionId = await onCreateSession();
        }
        let effectiveChatSessionId = chatSessionId;
        if (!effectiveChatSessionId && onCreateChatSession) {
          effectiveChatSessionId = await onCreateChatSession();
        }
        if (!effectiveChatSessionId) {
          restoreDraft();
          return;
        }
        if (loadingForId !== effectiveChatSessionId) {
          loadingForId = effectiveChatSessionId;
          setIsLoading(true, loadingForId);
        }
        if (effectiveSessionId && !canSend) {
          restoreDraft();
          return;
        }
        await sendChatMessage({
          chatSessionId: effectiveChatSessionId,
          userContent,
          selectedNodeContext,
          mentions: mentionPayload,
          imageStorageIds: imagePayload,
        });
        posthog.capture("message_sent", {
          session_id: effectiveSessionId,
          chat_session_id: effectiveChatSessionId,
          lane: sendLane,
          has_concept_references: referencedConcepts.length > 0,
          concept_reference_count: referencedConcepts.length,
          is_new_session: !!createdViaCallback,
        });
        setIsLoading(false, effectiveChatSessionId);
        for (const img of savedImages) URL.revokeObjectURL(img.previewUrl);
      } catch (err) {
        console.error("Chat error:", err);
        posthog.captureException(err);
        restoreDraft();
      }
      return;
    }

    let effectiveSessionId = sessionId;
    const createdViaCallback = !sessionId && onCreateSession;
    if (!effectiveSessionId && onCreateSession) {
      effectiveSessionId = await onCreateSession();
    }
    if (!effectiveSessionId) return;
    if (!createdViaCallback && !canSend) return;

    setIsLoading(true);

    try {
      await sendGraphMessage({
        sessionId: effectiveSessionId,
        userContent,
        selectedNodeContext,
        mentions: mentionPayload,
        imageStorageIds: imagePayload,
      });
      setInput("");
      for (const img of pendingImages) URL.revokeObjectURL(img.previewUrl);
      setPendingImages([]);
      posthog.capture("message_sent", {
        session_id: effectiveSessionId,
        lane: sendLane,
        has_concept_references: referencedConcepts.length > 0,
        concept_reference_count: referencedConcepts.length,
        is_new_session: !!createdViaCallback,
      });
      setIsLoading(false);
    } catch (err) {
      console.error("Chat error:", err);
      posthog.captureException(err);
      setIsLoading(false);
    }
  };

  const canSubmit =
    sendLane === "chat"
      ? !!chatSessionId || !!onCreateChatSession
      : sessionId
        ? canSend
        : !!onCreateSession;
  const isDisabled = isLoading || !canSubmit;

  const canCompose =
    sendLane === "chat"
      ? !!chatSessionId || !!onCreateChatSession
      : !!sessionId || !!onCreateSession;
  const placeholder = !canCompose
    ? "Select a session to start"
    : sendLane === "chat"
      ? numberedConcepts.length > 0
        ? "Type, @ ref writing, graph, canvas, concepts"
        : "Type, @ ref writing, graph, canvas"
      : numberedConcepts.length > 0
        ? "Type, @ ref writing, canvas, concepts"
        : "Type, @ ref writing, canvas";

  if (lockedHistorical) {
    return (
      <HistoricalBatchPrompt
        key={`${sessionId ?? "none"}-${selectedBatchIndex}`}
        content={lockedHistorical.content}
        mentions={lockedHistorical.mentions}
        sessionLoadingFrame={sessionLoadingFrame}
        sessionPastFrame={sessionPastFrame}
        autoCollapseSignal={autoCollapseSignal}
      />
    );
  }

  return (
    <ChatComposer
      input={input}
      setInput={setInput}
      placeholder={placeholder}
      numberedConcepts={numberedConcepts}
      isDisabled={isDisabled}
      isLoading={isLoading}
      sessionLoadingFrame={sessionLoadingFrame}
      sessionPastFrame={sessionPastFrame}
      onSubmit={handleSubmit}
      autoFocus={autoFocus}
      listenForFocusEvent={listenForFocusEvent}
      allowGraphRef={sendLane === "chat"}
      pendingImages={pendingImages}
      onAddImageFiles={addImageFiles}
      onRemoveImage={removeImage}
    />
  );
}
