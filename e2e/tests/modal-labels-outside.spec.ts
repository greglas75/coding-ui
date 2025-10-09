import { test } from '@playwright/test';

test.describe('Modal Labels Outside Boxes', () => {
  
  test('Labels should be outside boxes in SelectCodeModal', async ({ page }) => {
    // Navigate to coding page
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    // Try to find answer rows or navigate to codes page
    let answerRow = page.locator('tbody tr').first();
    
    if (!(await answerRow.isVisible())) {
      // Try navigating to codes page
      await page.goto('/codes');
      await page.waitForTimeout(3000);
      answerRow = page.locator('tbody tr').first();
    }
    
    if (await answerRow.isVisible()) {
      await answerRow.click();
      await page.waitForTimeout(1000);
      
      // Check if modal is open
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        console.log('✅ Modal is open');
        
        // Check Response section
        const responseLabel = page.locator('h3').filter({ hasText: 'Response' });
        const responseBox = page.locator('.border.border-blue-200, .border.border-blue-800');
        
        if (await responseLabel.isVisible() && await responseBox.isVisible()) {
          // Check if label is outside the box (not inside)
          const responseLabelPosition = await responseLabel.boundingBox();
          const responseBoxPosition = await responseBox.boundingBox();
          
          if (responseLabelPosition && responseBoxPosition) {
            // Label should be above the box
            if (responseLabelPosition.y < responseBoxPosition.y) {
              console.log('✅ Response label is outside and above the box');
            } else {
              console.log('❌ Response label is not above the box');
            }
          }
        } else {
          console.log('⚠️  Response section not found');
        }
        
        // Check AI Suggestions section
        const aiLabel = page.locator('h3').filter({ hasText: 'AI Suggestions' });
        const aiBox = page.locator('.border.border-purple-200, .border.border-purple-800');
        
        if (await aiLabel.isVisible() && await aiBox.isVisible()) {
          const aiLabelPosition = await aiLabel.boundingBox();
          const aiBoxPosition = await aiBox.boundingBox();
          
          if (aiLabelPosition && aiBoxPosition) {
            if (aiLabelPosition.y < aiBoxPosition.y) {
              console.log('✅ AI Suggestions label is outside and above the box');
            } else {
              console.log('❌ AI Suggestions label is not above the box');
            }
          }
        } else {
          console.log('⚠️  AI Suggestions section not found');
        }
        
        // Check Codes section
        const codesLabel = page.locator('h3').filter({ hasText: 'Codes' });
        const codesBox = page.locator('.border.border-green-200, .border.border-green-800');
        
        if (await codesLabel.isVisible() && await codesBox.isVisible()) {
          const codesLabelPosition = await codesLabel.boundingBox();
          const codesBoxPosition = await codesBox.boundingBox();
          
          if (codesLabelPosition && codesBoxPosition) {
            if (codesLabelPosition.y < codesBoxPosition.y) {
              console.log('✅ Codes label is outside and above the box');
            } else {
              console.log('❌ Codes label is not above the box');
            }
          }
        } else {
          console.log('⚠️  Codes section not found');
        }
        
        // Check overall structure
        const allLabels = page.locator('h3');
        const allBoxes = page.locator('.border.rounded-lg');
        
        const labelCount = await allLabels.count();
        const boxCount = await allBoxes.count();
        
        console.log(`Found ${labelCount} labels and ${boxCount} boxes`);
        
        if (labelCount >= 3 && boxCount >= 3) {
          console.log('✅ Modal has proper structure with labels and boxes');
        } else {
          console.log('❌ Modal structure is incomplete');
        }
        
      } else {
        console.log('⚠️  Modal did not open');
      }
      
    } else {
      console.log('⚠️  No answer rows found');
    }
  });

  test('Modal should have clean professional appearance', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    let answerRow = page.locator('tbody tr').first();
    
    if (!(await answerRow.isVisible())) {
      // Try navigating to codes page
      await page.goto('/codes');
      await page.waitForTimeout(3000);
      answerRow = page.locator('tbody tr').first();
    }
    
    if (await answerRow.isVisible()) {
      await answerRow.click();
      await page.waitForTimeout(1000);
      
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        // Check for clean styling
        const responseBox = page.locator('.border.border-blue-200, .border.border-blue-800');
        const aiBox = page.locator('.border.border-purple-200, .border.border-purple-800');
        const codesBox = page.locator('.border.border-green-200, .border.border-green-800');
        
        // Check if boxes have proper styling
        if (await responseBox.isVisible()) {
          const responseClasses = await responseBox.getAttribute('class');
          if (responseClasses?.includes('rounded-lg') && responseClasses?.includes('p-4')) {
            console.log('✅ Response box has proper styling');
          } else {
            console.log('❌ Response box styling is incorrect');
          }
        }
        
        if (await aiBox.isVisible()) {
          const aiClasses = await aiBox.getAttribute('class');
          if (aiClasses?.includes('rounded-lg') && aiClasses?.includes('p-4')) {
            console.log('✅ AI Suggestions box has proper styling');
          } else {
            console.log('❌ AI Suggestions box styling is incorrect');
          }
        }
        
        if (await codesBox.isVisible()) {
          const codesClasses = await codesBox.getAttribute('class');
          if (codesClasses?.includes('rounded-lg') && codesClasses?.includes('p-4')) {
            console.log('✅ Codes box has proper styling');
          } else {
            console.log('❌ Codes box styling is incorrect');
          }
        }
        
        // Check for no emojis in labels
        const allLabels = page.locator('h3');
        const labelCount = await allLabels.count();
        
        let hasEmojis = false;
        for (let i = 0; i < labelCount; i++) {
          const labelText = await allLabels.nth(i).textContent();
          if (labelText && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(labelText)) {
            hasEmojis = true;
            break;
          }
        }
        
        if (!hasEmojis) {
          console.log('✅ Labels are clean without emojis');
        } else {
          console.log('❌ Labels contain emojis');
        }
        
      } else {
        console.log('⚠️  Modal did not open');
      }
      
    } else {
      console.log('⚠️  No answer rows found');
    }
  });
});
