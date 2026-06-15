import type { WorkspaceState, User, Actor } from '$lib/server/types';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      /** Opaque per-browser sandbox id (cookie `cadence_device`). */
      deviceId: string;
      /** This device's isolated in-memory workspace (the "DB" stand-in). */
      state: WorkspaceState;
      /** Whether this device has signed in (false → show the login screen). */
      authed: boolean;
      /** The signed-in human for this device's sandbox, or null. */
      user: User | null;
      /**
       * The unified actor for every domain/permission check.
       * Today always the human (`isAgent:false`); phase 2 adds the
       * DioscHub agent-as-user branch without changing anything downstream.
       */
      actor: Actor | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
