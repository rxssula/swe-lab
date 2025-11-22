// app/utils/uploadFile.js
export async function uploadFileToServer(uri, name, mimeType, uploadUrl = 'https://your-server.com/upload') {
  const form = new FormData();
  form.append('file', {
    uri,
    name: name || 'file',
    type: mimeType || 'application/octet-stream',
  });

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data',
      // add auth headers if needed
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  return res.json(); // expected to return { url: 'https://...' } or similar
}
