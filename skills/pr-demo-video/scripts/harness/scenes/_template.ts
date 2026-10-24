import type { Scene } from '../harness';

// One improvement, one scene. Copy to scenes/NN-slug.ts.
export const scene: Scene = {
  id: 'NN-slug',
  title: 'Short title of the improvement',
  async prepare({ page }) {
    // Reach the storyboard's START STATE from a fresh logged-in page.
    // Use the product itself (navigation, local drafts); no server writes
    // unless the storyboard allows them.
    await page.goto('/');
  },
  async play({ page, caption, show, hold, note }) {
    const target = page.getByRole('button', { name: 'Exact label' });
    await caption('What the viewer should notice, in the user language');
    await show(target);
    await target.click();
    await hold(1500);
    note(`after click: ${await page.getByRole('status').first().textContent()}`);
    // End exactly at the storyboard's END STATE.
  },
};
