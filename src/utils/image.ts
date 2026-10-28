const AVATAR_SIZE = 160;

export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const side = Math.min(image.width, image.height);
      const left = (image.width - side) / 2;
      const top = (image.height - side) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Браузер не смог обработать картинку."));
        return;
      }

      context.drawImage(image, left, top, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      URL.revokeObjectURL(url);

      resolve(canvas.toDataURL("image/webp", 0.85));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не получилось открыть картинку."));
    };

    image.src = url;
  });
}
