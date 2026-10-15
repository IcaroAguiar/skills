function replaceBlock(page: string, block: string) {
  const start = page.indexOf(START);
  const end = page.indexOf(END);
  // ruleid: indexof-unchecked
  return page.slice(0, start) + block + page.slice(end + END.length);
}

function removeItem(list: string[], item: string) {
  // ruleid: indexof-unchecked
  list.splice(list.indexOf(item), 1);
}

function basename(path: string) {
  // ok: indexof-unchecked
  return path.slice(path.lastIndexOf("/") + 1);
}

function afterMarker(text: string) {
  // ruleid: indexof-unchecked
  return text.slice(text.indexOf(MARK) + MARK.length);
}

function guarded(page: string, block: string) {
  const start = page.indexOf(START);
  if (start === -1) throw new Error("missing start marker");
  // ok: indexof-unchecked
  return page.slice(0, start) + block;
}

function guardedRemove(list: string[], item: string) {
  const index = list.indexOf(item);
  if (index >= 0) {
    // ok: indexof-unchecked
    list.splice(index, 1);
  }
}

function ternary(list: string[], item: string) {
  const index = list.findIndex((value) => value === item);
  // ok: indexof-unchecked
  return index === -1 ? undefined : list[index];
}
