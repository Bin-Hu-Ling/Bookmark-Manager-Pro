/**
 * Feature Verification Checklist
 * Run this in browser console after loading extension to verify functionality
 */

console.log('=== Bookmark Manager Extension Feature Verification ===');

// Check if extension APIs are available
const apiChecks = {
  'chrome.bookmarks API': typeof chrome !== 'undefined' && chrome.bookmarks,
  'chrome.storage API': typeof chrome !== 'undefined' && chrome.storage,
  'chrome.runtime API': typeof chrome !== 'undefined' && chrome.runtime,
  'Manifest V3 support': typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest,
};

console.log('\n1. API Availability Check:');
Object.entries(apiChecks).forEach(([api, available]) => {
  console.log(`  ${available ? '✓' : '✗'} ${api}: ${available ? 'Available' : 'Not available'}`);
});

// Check extension manifest
if (chrome.runtime && chrome.runtime.getManifest) {
  const manifest = chrome.runtime.getManifest();
  console.log('\n2. Manifest Verification:');
  console.log(`  ✓ Name: ${manifest.name}`);
  console.log(`  ✓ Version: ${manifest.version}`);
  console.log(`  ✓ Manifest version: ${manifest.manifest_version}`);
  console.log(`  ✓ Permissions: ${manifest.permissions?.join(', ') || 'None'}`);
  
  // Check required permissions
  const requiredPerms = ['bookmarks', 'storage'];
  const missingPerms = requiredPerms.filter(perm => !manifest.permissions?.includes(perm));
  if (missingPerms.length > 0) {
    console.log(`  ✗ Missing permissions: ${missingPerms.join(', ')}`);
  } else {
    console.log('  ✓ All required permissions present');
  }
}

// Test bookmark API functionality
console.log('\n3. Bookmark API Test:');
if (chrome.bookmarks) {
  chrome.bookmarks.getTree((bookmarkTree) => {
    if (chrome.runtime.lastError) {
      console.log(`  ✗ Error accessing bookmarks: ${chrome.runtime.lastError.message}`);
    } else {
      console.log(`  ✓ Bookmark access successful`);
      console.log(`  ✓ Found ${countBookmarks(bookmarkTree)} bookmarks in tree`);
      
      // Test storage API
      testStorageAPI();
    }
  });
} else {
  console.log('  ✗ Bookmark API not available');
}

function countBookmarks(tree) {
  let count = 0;
  function traverse(node) {
    if (node.url) count++;
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  tree.forEach(traverse);
  return count;
}

function testStorageAPI() {
  console.log('\n4. Storage API Test:');
  if (chrome.storage && chrome.storage.local) {
    const testData = { testTimestamp: Date.now(), testString: 'Bookmark Manager Test' };
    
    chrome.storage.local.set(testData, () => {
      if (chrome.runtime.lastError) {
        console.log(`  ✗ Storage set failed: ${chrome.runtime.lastError.message}`);
      } else {
        console.log('  ✓ Storage set successful');
        
        chrome.storage.local.get(['testTimestamp', 'testString'], (result) => {
          if (chrome.runtime.lastError) {
            console.log(`  ✗ Storage get failed: ${chrome.runtime.lastError.message}`);
          } else if (result.testString === testData.testString) {
            console.log('  ✓ Storage get successful - data integrity verified');
            
            // Clean up test data
            chrome.storage.local.remove(['testTimestamp', 'testString'], () => {
              console.log('  ✓ Test data cleaned up');
              runComponentTests();
            });
          } else {
            console.log('  ✗ Data integrity check failed');
          }
        });
      }
    });
  } else {
    console.log('  ✗ Storage API not available');
  }
}

function runComponentTests() {
  console.log('\n5. Component Availability Test:');
  
  // Check if popup components are loaded
  const components = [
    'BookmarkTree',
    'TagManager', 
    'SearchManager',
    'DragManager',
    'BatchManager',
    'StatsVisualizer'
  ];
  
  // These would be checked in the popup context
  console.log('  Note: Component tests need to run in popup context');
  console.log('  To test components:');
  console.log('  1. Open extension popup');
  console.log('  2. Open DevTools (F12)');
  console.log('  3. Run: console.log(window.BookmarkTree, window.TagManager, etc.)');
  
  console.log('\n=== Verification Complete ===');
  console.log('\nNext steps:');
  console.log('1. Open extension popup and check UI renders correctly');
  console.log('2. Test search functionality in search box');
  console.log('3. Click on bookmark folders to expand/collapse');
  console.log('4. Try adding tags to bookmarks');
  console.log('5. Check statistics panel shows data');
}

// Export for use in popup context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { countBookmarks };
}