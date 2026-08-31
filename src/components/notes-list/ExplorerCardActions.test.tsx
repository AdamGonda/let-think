import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExplorerCardActions } from "./ExplorerCardActions";

const labels = {
  onRename: vi.fn(),
  onDelete: vi.fn(),
  renameLabel: "Rename file",
  deleteLabel: "Delete file",
  deleteTitle: "Delete this file?",
  deleteDescription: "“Notes” will be permanently deleted.",
};

describe("ExplorerCardActions delete confirm", () => {
  it("keeps the delete button and asks in a dialog before deleting", () => {
    const onDelete = vi.fn();
    render(<ExplorerCardActions {...labels} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete file" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "Delete this file?" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Delete file" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
