function serializeCall(call: Call) {
  return {
    // ruleid: hard-truncate-text
    description: call.description.slice(0, 2_000),
    // ruleid: hard-truncate-text
    title: call.title.substring(0, MAX_TITLE_LENGTH),
  };
}

function initials(name: string) {
  // ok: hard-truncate-text
  return name.slice(0, 2);
}

function day(iso: string) {
  // ok: hard-truncate-text
  return iso.slice(0, 10);
}

function firstPage(items: Item[]) {
  // ok: hard-truncate-text
  return items.slice(0, 50);
}

function shortFile(user: User) {
  // ok: hard-truncate-text
  return user.filename.slice(0, 12);
}
