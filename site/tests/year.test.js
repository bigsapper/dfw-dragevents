import { describe, it, expect, beforeEach } from 'vitest';

describe('year.js', () => {
  beforeEach(() => {
    // Create the year element
    document.body.innerHTML = '<span id="year"></span>';
  });

  it('should set the current year in the year element', async () => {
    // Import the module (this executes the code)
    await import('../assets/js/year.js?year-set');
    
    const yearElement = document.getElementById('year');
    const currentYear = new Date().getFullYear();
    
    expect(yearElement.textContent).toBe(currentYear.toString());
  });

  it('should handle missing year element gracefully', async () => {
    // Remove the year element
    document.body.innerHTML = '';
    
    await expect(import('../assets/js/year.js?year-missing')).resolves.toBeDefined();
  });
});
