/**
 * Edge Browser Compatibility Test
 * Tests specific to Microsoft Edge compatibility
 */

console.log('=== Microsoft Edge Compatibility Test ===');

// Edge-specific API checks
const edgeSpecificChecks = {
  'browser namespace (Edge)': typeof browser !== 'undefined',
  'chrome namespace (Chromium)': typeof chrome !== 'undefined',
  'Edge version detection': navigator.userAgent.includes('Edg/'),
  'Manifest V3 support': typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest,
};

console.log('\n1. Browser Environment:');
console.log(`  User Agent: ${navigator.userAgent}`);
Object.entries(edgeSpecificChecks).forEach(([check, available]) => {
  console.log(`  ${available ? '✓' : '✗'} ${check}: ${available ? 'Yes' : 'No'}`);
});

// Check if we're in Edge
const isEdge = navigator.userAgent.includes('Edg/');
console.log(`\n2. Browser Detection: ${isEdge ? 'Microsoft Edge' : 'Not Edge (may be Chrome or other)'}`);

// Test Edge-specific behaviors
console.log('\n3. Edge-Specific API Tests:');

// Check if browser.bookmarks exists (Edge sometimes uses browser namespace)
if (typeof browser !== 'undefined' && browser.bookmarks) {
  console.log('  ✓ browser.bookmarks API available (Edge namespace)');
  testBookmarksAPI('browser');
} else if (typeof chrome !== 'undefined' && chrome.bookmarks) {
  console.log('  ✓ chrome.bookmarks API available (Chromium namespace)');
  testBookmarksAPI('chrome');
} else {
  console.log('  ✗ No bookmarks API available');
}

// Test storage API compatibility
console.log('\n4. Storage API Compatibility:');
if (typeof browser !== 'undefined' && browser.storage) {
  console.log('  ✓ browser.storage API available');
  testStorageCompatibility('browser');
} else if (typeof chrome !== 'undefined' && chrome.storage) {
  console.log('  ✓ chrome.storage API available');
  testStorageCompatibility('chrome');
} else {
  console.log('  ✗ No storage API available');
}

// Test runtime API
console.log('\n5. Runtime API Compatibility:');
if (typeof browser !== 'undefined' && browser.runtime) {
  console.log('  ✓ browser.runtime API available');
  testRuntimeAPI('browser');
} else if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('  ✓ chrome.runtime API available');
  testRuntimeAPI('chrome');
} else {
  console.log('  ✗ No runtime API available');
}

function testBookmarksAPI(namespace) {
  const api = namespace === 'browser' ? browser.bookmarks : chrome.bookmarks;
  
  api.getTree((bookmarkTree) => {
    const error = namespace === 'browser' ? browser.runtime.lastError : chrome.runtime.lastError;
    if (error) {
      console.log(`  ✗ ${namespace}.bookmarks.getTree error: ${error.message}`);
    } else {
      console.log(`  ✓ ${namespace}.bookmarks.getTree successful`);
      console.log(`  ✓ Bookmark tree structure: ${bookmarkTree.length} root folders`);
    }
  });
}

function testStorageCompatibility(namespace) {
  const storage = namespace === 'browser' ? browser.storage.local : chrome.storage.local;
  
  const testData = { 
    edgeTest: true, 
    timestamp: Date.now(),
    testString: 'Edge compatibility test'
  };
  
  storage.set(testData, () => {
    const error = namespace === 'browser' ? browser.runtime.lastError : chrome.runtime.lastError;
    if (error) {
      console.log(`  ✗ ${namespace}.storage.set error: ${error.message}`);
    } else {
      console.log(`  ✓ ${namespace}.storage.set successful`);
      
      storage.get(['edgeTest', 'testString'], (result) => {
        const getError = namespace === 'browser' ? browser.runtime.lastError : chrome.runtime.lastError;
        if (getError) {
          console.log(`  ✗ ${namespace}.storage.get error: ${getError.message}`);
        } else if (result.testString === testData.testString) {
          console.log(`  ✓ ${namespace}.storage.get successful - data integrity verified`);
          
          // Clean up
          storage.remove(['edgeTest', 'timestamp', 'testString'], () => {
            console.log(`  ✓ Test data cleaned up from ${namespace}.storage`);
          });
        } else {
          console.log(`  ✗ Data integrity check failed for ${namespace}.storage`);
        }
      });
    }
  });
}

function testRuntimeAPI(namespace) {
  const runtime = namespace === 'browser' ? browser.runtime : chrome.runtime;
  
  if (runtime.getManifest) {
    const manifest = runtime.getManifest();
    console.log(`  ✓ ${namespace}.runtime.getManifest available`);
    console.log(`    - Extension: ${manifest.name} v${manifest.version}`);
    console.log(`    - Manifest: V${manifest.manifest_version}`);
    
    // Check for Edge-specific manifest requirements
    if (manifest.key) {
      console.log(`    ✓ Has extension key (may be required for Edge)`);
    }
  } else {
    console.log(`  ✗ ${namespace}.runtime.getManifest not available`);
  }
  
  // Test message passing
  if (runtime.sendMessage) {
    console.log(`  ✓ ${namespace}.runtime.sendMessage available`);
  }
  
  if (runtime.onMessage) {
    console.log(`  ✓ ${namespace}.runtime.onMessage available`);
  }
}

// Edge-specific recommendations
console.log('\n6. Edge Compatibility Recommendations:');
console.log('  ✓ Use chrome.* namespace (Edge supports Chromium APIs)');
console.log('  ✓ Manifest V3 is fully supported in Edge');
console.log('  ✓ No special polyfills needed for basic bookmark functionality');
console.log('  ✓ Test both browser.* and chrome.* namespaces for compatibility');

if (isEdge) {
  console.log('\n7. Edge-Specific Notes:');
  console.log('  - Edge uses Chromium engine, so Chrome extensions work natively');
  console.log('  - Some Chrome-specific APIs may have Edge equivalents');
  console.log('  - Extension should work without modifications');
}

console.log('\n=== Edge Compatibility Test Complete ===');
console.log('\nTo load extension in Edge:');
console.log('1. Open edge://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked"');
console.log('4. Select the "dist" folder');
console.log('5. Test all features work as in Chrome');