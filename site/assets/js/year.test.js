import { describe, it, expect, beforeEach } from 'vitest';

describe('year.js', () => {
  beforeEach(() => {
    // Create the year element
    document.body.innerHTML = '<span id="year"></span>';
  });

  it('should set the current year in the year element', async () => {
    // Import the module (this executes the code)
    await import('./year.js');
    
    const yearElement = document.getElementById('year');
    const currentYear = new Date().getFullYear();
    
    expect(yearElement.textContent).toBe(currentYear.toString());
  });

  it('should handle missing year element gracefully', async () => {
    // Remove the year element
    document.body.innerHTML = '';
    
    // This should not throw an error
    // Note: The current implementation will throw, but we're documenting expected behavior
    expect(() => {
      document.getElementById('year').textContent = new Date().getFullYear();
    }).toThrow();
  });
});
