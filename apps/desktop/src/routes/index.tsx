import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import reactLogo from "../assets/react.svg";
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="flex flex-col items-center justify-center gap-6 px-4 pt-[10vh] text-center">
      <h1 className="text-3xl font-semibold">Welcome to Tauri + React</h1>

      <div className="flex justify-center gap-4">
        <a href="https://vite.dev" target="_blank">
          <img
            src="/vite.svg"
            className="h-24 w-24 transition duration-700 hover:drop-shadow-[0_0_2em_#747bff]"
            alt="Vite logo"
          />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img
            src="/tauri.svg"
            className="h-24 w-24 transition duration-700 hover:drop-shadow-[0_0_2em_#24c8db]"
            alt="Tauri logo"
          />
        </a>
        <a href="https://react.dev" target="_blank">
          <img
            src={reactLogo}
            className="h-24 w-24 transition duration-700 hover:drop-shadow-[0_0_2em_#61dafb]"
            alt="React logo"
          />
        </a>
      </div>
      <p className="text-base">
        Click on the Tauri, Vite, and React logos to learn more.
      </p>

      <form
        className="flex justify-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          className="rounded-lg border border-transparent px-4 py-2 text-base font-medium outline-none shadow-[0_2px_2px_rgba(0,0,0,0.2)] transition-colors focus:border-[#396cd8]"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button
          type="submit"
          className="cursor-pointer rounded-lg border border-transparent px-4 py-2 text-base font-medium shadow-[0_2px_2px_rgba(0,0,0,0.2)] transition-colors hover:border-[#396cd8] active:border-[#396cd8]"
        >
          Greet
        </button>
      </form>
      <p className="text-base">{greetMsg}</p>
    </main>
  );
}
