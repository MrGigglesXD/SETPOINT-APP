import { invoke } from "@tauri-apps/api/core";

export interface QueuePlayer {
  position: number;
  id: string;
  name: string;
  level: number;
  arrival_time: string;
  wait_minutes: number;
  matches_played: number;
  status: string;
  next_in: boolean;
}

export const queueApi = {
  list(): Promise<QueuePlayer[]> {
    return invoke<QueuePlayer[]>("get_queue");
  },

  resetOrder(): Promise<number> {
    return invoke<number>("reset_arrival_order");
  },
};
