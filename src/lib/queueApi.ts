import { invoke } from "@tauri-apps/api/core";

export interface QueuePlayer {
  id: string;
  name: string;
  level: number;
  arrival_time: string;
  wait_minutes: number;
  matches_played: number;
}

export const queueApi = {
  list(): Promise<QueuePlayer[]> {
    return invoke<QueuePlayer[]>("get_queue");
  },

  resetOrder(): Promise<number> {
    return invoke<number>("reset_arrival_order");
  },
};
