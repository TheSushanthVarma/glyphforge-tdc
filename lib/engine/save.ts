/** Saves a file. Inside a claude.ai artifact it uses the host's `downloads` capability;
 *  everywhere else (your own Next.js deployment) it falls back to a normal browser download. */
export async function saveFile(name: string, blob: Blob): Promise<string> {
  const w = window as any;
  let dl: any = null;
  try { dl = w.claude && w.claude.use ? await w.claude.use('downloads') : null; } catch { dl = null; }
  if (dl) {
    try { await dl.save({ filename: name, data: blob }); return 'Saved ' + name; }
    catch (e: any) {
      if (e && e.code === 'declined') return 'Save cancelled';
      if (e && e.code === 'rate_limited') return 'A save prompt is already open';
    }
  }
  try {
    const u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
    return 'Downloading ' + name;
  } catch { return 'Download blocked here'; }
}
