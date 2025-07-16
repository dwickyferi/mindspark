// Test script to verify organization API endpoints
// Run with: node test-org-api.js (after setting up test environment)

const BASE_URL = 'http://localhost:3000';

async function testOrganizationAPI() {
  console.log('🧪 Testing Organization API Endpoints...\n');
  
  try {
    // Test 1: List organizations
    console.log('1. Testing GET /api/organizations');
    const listResponse = await fetch(`${BASE_URL}/api/organizations`, {
      headers: {
        'Content-Type': 'application/json',
        // Note: In real test, you'd need proper authentication headers
      }
    });
    
    if (listResponse.ok) {
      const orgs = await listResponse.json();
      console.log('✅ List organizations successful:', orgs.length, 'organizations found');
    } else {
      console.log('❌ List organizations failed:', listResponse.status);
    }
    
    // Test 2: Create organization
    console.log('\n2. Testing POST /api/organizations');
    const createResponse = await fetch(`${BASE_URL}/api/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Organization',
        description: 'A test organization for API testing'
      })
    });
    
    if (createResponse.ok) {
      const newOrg = await createResponse.json();
      console.log('✅ Create organization successful:', newOrg.name);
      
      // Test 3: Update organization
      console.log('\n3. Testing PUT /api/organizations/[id]');
      const updateResponse = await fetch(`${BASE_URL}/api/organizations/${newOrg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Test Organization',
          description: 'Updated description',
          action: 'update_details'
        })
      });
      
      if (updateResponse.ok) {
        console.log('✅ Update organization successful');
      } else {
        console.log('❌ Update organization failed:', updateResponse.status);
      }
      
      // Test 4: Get organization members
      console.log('\n4. Testing GET /api/organizations/[id]/members');
      const membersResponse = await fetch(`${BASE_URL}/api/organizations/${newOrg.id}/members`);
      
      if (membersResponse.ok) {
        const members = await membersResponse.json();
        console.log('✅ Get members successful:', members.length, 'members found');
      } else {
        console.log('❌ Get members failed:', membersResponse.status);
      }
      
      // Test 5: Invite member
      console.log('\n5. Testing POST /api/organizations/[id]/members');
      const inviteResponse = await fetch(`${BASE_URL}/api/organizations/${newOrg.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          role: 'member'
        })
      });
      
      if (inviteResponse.ok) {
        console.log('✅ Invite member successful');
      } else {
        console.log('❌ Invite member failed:', inviteResponse.status);
      }
      
    } else {
      console.log('❌ Create organization failed:', createResponse.status);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
  
  console.log('\n🏁 Organization API tests completed');
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testOrganizationAPI };
}

// Run if executed directly
if (require.main === module) {
  testOrganizationAPI();
}
