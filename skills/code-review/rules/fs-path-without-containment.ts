async function download(req: Request, res: Response) {
  // ruleid: fs-path-without-containment
  const file = await fs.readFile(path.join(UPLOAD_ROOT, req.params.name));
  res.send(file);
}

async function remove(name: string) {
  // ruleid: fs-path-without-containment
  const target = path.resolve(UPLOAD_ROOT, name);
  await fs.rm(target);
}

async function bundled() {
  // ok: fs-path-without-containment
  return fs.readFile(path.join(__dirname, "template.html"));
}
