import { Mp3Encoder } from '@breezystack/lamejs';

export async function convertUrlToRealMp3(mediaUrl, onStatus) {
  onStatus('Fetching audio stream...');

  let arrayBuffer;
  try {
    const res = await fetch(mediaUrl, { mode: 'cors' });
    if (!res.ok) throw new Error('Direct blocked');
    arrayBuffer = await res.arrayBuffer();
  } catch {
    const proxyRes = await fetch(`/api/download?url=${encodeURIComponent(mediaUrl)}`);
    if (!proxyRes.ok) throw new Error('Stream unavailable');
    arrayBuffer = await proxyRes.arrayBuffer();
  }

  onStatus('Decoding audio...');
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  onStatus('Encoding real MP3...');
  const channels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const kbps = 128;

  const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const floatSamples = audioBuffer.getChannelData(0);

  const samples = new Int16Array(floatSamples.length);
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const mp3Data = [];
  const blockSize = 1152;
  for (let i = 0; i < samples.length; i += blockSize) {
    const chunk = samples.subarray(i, i + blockSize);
    const mp3buf = mp3encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) mp3Data.push(endBuf);

  await audioCtx.close();

  const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
  const blobUrl = URL.createObjectURL(mp3Blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'ukdownloaders-audio.mp3';
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}