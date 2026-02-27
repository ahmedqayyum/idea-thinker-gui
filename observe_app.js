#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function observeApp() {
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Enable console log capture
  page.on('console', msg => {
    console.log('🖥️  CONSOLE:', msg.type(), msg.text());
  });
  
  // Capture errors
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
  });
  
  // Capture network failures
  page.on('requestfailed', request => {
    console.error('🌐 REQUEST FAILED:', request.url(), request.failure().errorText);
  });
  
  try {
    console.log('📍 Navigating to http://localhost:5173/...');
    await page.goto('http://localhost:5173/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Step 1: Take initial screenshot
    console.log('📸 Step 1: Taking initial screenshot...');
    await page.screenshot({ path: 'screenshot_01_initial.png', fullPage: true });
    console.log('✅ Saved: screenshot_01_initial.png');
    
    // Get page title and content
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Look for preset/suggestion elements
    console.log('\n🔍 Step 2: Looking for preset options and UI elements...');
    
    const pageContent = await page.evaluate(() => {
      return {
        h1Text: document.querySelector('h1')?.textContent,
        suggestionsFound: document.querySelectorAll('button').length,
        hasPromptInput: !!document.querySelector('textarea') || !!document.querySelector('input[type="text"]'),
        buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          disabled: btn.disabled
        })).filter(btn => btn.text)
      };
    });
    
    console.log('📊 UI Elements found:');
    console.log('  - Main heading:', pageContent.h1Text);
    console.log('  - Has prompt input:', pageContent.hasPromptInput);
    console.log('  - Number of buttons:', pageContent.suggestionsFound);
    console.log('  - Buttons:', pageContent.buttons);
    
    // Wait for suggestions to load
    console.log('\n⏳ Waiting for suggestion chips to load...');
    await page.waitForTimeout(2000);
    
    // Take screenshot after loading
    await page.screenshot({ path: 'screenshot_02_loaded.png', fullPage: true });
    console.log('✅ Saved: screenshot_02_loaded.png');
    
    // Step 3: Try to click a preset
    console.log('\n🖱️  Step 3: Attempting to click a preset...');
    
    const presetButtons = await page.$$('button');
    console.log(`Found ${presetButtons.length} clickable buttons`);
    
    if (presetButtons.length > 0) {
      // Click the first suggestion card
      console.log('Clicking first suggestion...');
      await presetButtons[0].click();
      
      // Wait for navigation/state change
      await page.waitForTimeout(3000);
      
      // Take screenshot after click
      await page.screenshot({ path: 'screenshot_03_after_click.png', fullPage: true });
      console.log('✅ Saved: screenshot_03_after_click.png');
      
      // Check what happened
      const afterClick = await page.evaluate(() => {
        return {
          url: window.location.href,
          h1Text: document.querySelector('h1')?.textContent,
          bodyText: document.body.textContent?.slice(0, 500)
        };
      });
      
      console.log('📍 After click:');
      console.log('  - URL:', afterClick.url);
      console.log('  - Heading:', afterClick.h1Text);
      console.log('  - Body preview:', afterClick.bodyText?.slice(0, 200));
      
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshot_04_final_state.png', fullPage: true });
      console.log('✅ Saved: screenshot_04_final_state.png');
    }
    
    // Step 5: Open dev tools console (check for errors)
    console.log('\n🔧 Step 5: Checking browser console for errors...');
    const logs = await page.evaluate(() => {
      return {
        errors: window.console.errors || [],
        warnings: window.console.warnings || []
      };
    });
    console.log('Console logs captured during session (see above)');
    
    // Get network activity
    console.log('\n🌐 Checking network activity...');
    const networkRequests = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        duration: r.duration,
        type: r.initiatorType
      }));
    });
    
    console.log('Network requests:', networkRequests.filter(r => r.name.includes('localhost')));
    
  } catch (error) {
    console.error('💥 Error during observation:', error.message);
    await page.screenshot({ path: 'screenshot_error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✨ Browser closed. Check the screenshot files for visual results.');
  }
}

observeApp().catch(console.error);
