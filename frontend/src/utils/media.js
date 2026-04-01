export const buildUploadAssetUrl = (baseUrl, picture, expectedDirectory, cacheKey = "") => {
  if (!picture) return null;

  const rawValue = String(picture).trim();
  if (!rawValue) return null;
  if (/^https?:\/\//i.test(rawValue)) return rawValue;

  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedPicture = rawValue.replace(/^\/+/, "");
  const suffix = cacheKey ? `?v=${cacheKey}` : "";
  const directory = String(expectedDirectory || "").replace(/^\/+|\/+$/g, "");

  if (normalizedPicture.startsWith("uploads/")) {
    const baseWithoutUploads = normalizedBase.replace(/\/uploads(?:\/[^/]+)?$/i, "");
    return `${baseWithoutUploads}/${normalizedPicture}${suffix}`;
  }

  if (directory && normalizedPicture.startsWith(`${directory}/`)) {
    const baseWithoutDirectory = normalizedBase.replace(new RegExp(`/${directory}$`, "i"), "");
    return `${baseWithoutDirectory}/${normalizedPicture}${suffix}`;
  }

  return `${normalizedBase}/${normalizedPicture}${suffix}`;
};
