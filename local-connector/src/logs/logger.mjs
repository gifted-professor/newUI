import { updateState } from "../store/state-store.mjs";

export async function appendLog(level, message) {
  await updateState((state) => {
    state.logs.unshift({
      ts: new Date().toISOString(),
      level,
      message,
    });
    state.logs = state.logs.slice(0, 200);
  });
}
