import { showToast } from "@/utils/toast";
import { copyText } from "@/utils/share";

export async function copyRoomCode(roomId: string) {
  if (await copyText(roomId)) showToast("Код комнаты скопирован.", "success");
  else showToast(`Код комнаты: ${roomId}`);
}
