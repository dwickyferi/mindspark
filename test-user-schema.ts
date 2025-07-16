// Test file to verify User schema types
import { User } from '@/lib/db/schema';

// This should compile without errors and show the name field is available
function testUserSchema(user: User) {
  console.log('User ID:', user.id);
  console.log('User Email:', user.email);
  console.log('User Password:', user.password);
  console.log('User Name:', user.name); // This should work now
}

// Example usage
const exampleUser: User = {
  id: 'test-id',
  email: 'test@example.com',
  password: 'hashed-password',
  name: 'John Doe', // This should be allowed
};

testUserSchema(exampleUser);
