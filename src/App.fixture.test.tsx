// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";

function renderFixtureApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App browser fixture mode", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/?fixture=1");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
  });

  afterEach(() => {
    cleanup();
    window.history.pushState(null, "", "/");
  });

  it("drives the core memory review flow without Tauri commands", async () => {
    const { findByPlaceholderText, findByText, getByRole, queryByPlaceholderText } =
      renderFixtureApp();

    expect(await findByText("Fixture mode: demo memory only")).toBeInTheDocument();
    expect(await findByText("Current profile")).toBeInTheDocument();
    expect(await findByText(/primary stack is Python\/Rust/)).toBeInTheDocument();

    fireEvent.click(getByRole("button", { name: /Activity Log/ }));
    expect(await findByText("Recent activity")).toBeInTheDocument();

    fireEvent.click(getByRole("button", { name: /Sources/ }));
    expect(await findByText("MEMORY.md")).toBeInTheDocument();
    fireEvent.change(await findByPlaceholderText("Search memory..."), {
      target: { value: "not-a-source" },
    });
    expect(await findByText("No sources match this view.")).toBeInTheDocument();

    fireEvent.click(getByRole("button", { name: "Audit" }));
    await waitFor(() => expect(queryByPlaceholderText("Search memory...")).not.toBeInTheDocument());
    fireEvent.click(getByRole("button", { name: /Run Codex Audit/ }));
    expect(await findByText("Primary stack mismatch")).toBeInTheDocument();

    fireEvent.click(getByRole("button", { name: /Draft correction/ }));
    expect(await findByText("Correction note")).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Write correction note" }));
    expect(await findByText(/Correction note written:/)).toBeInTheDocument();
  });
});
