import fs from 'fs';
import path from 'path';

describe('Accessibility Features', () => {
  beforeEach(() => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    document.documentElement.innerHTML = html;
  });

  test('skip link exists and points to main content', () => {
    const skipLink = document.querySelector('.skip-link');
    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute('href')).toBe('#main-content');

    // Check if the target exists
    const target = document.querySelector(skipLink.getAttribute('href'));
    expect(target).toBeTruthy();
    expect(target.tagName).toBe('MAIN');
  });
});
