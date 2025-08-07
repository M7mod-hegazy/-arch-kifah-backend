// Test ObjectId validation
import { ObjectId } from 'mongodb';

const testIds = [
  '688e040f148561ceaaf4741d',
  '688e043e148561ceaaf4741e',
  '688e045d148561ceaaf4741f',
  '688e4c5e8e882d9d9674f53e',
  '688e4ca68e882d9d9674f53f'
];

console.log('Testing ObjectId validation:');
testIds.forEach((id, index) => {
  const isValid = ObjectId.isValid(id);
  console.log(`${index + 1}. ${id} - Valid: ${isValid}`);
  
  if (isValid) {
    try {
      const objectId = new ObjectId(id);
      console.log(`   Created ObjectId: ${objectId}`);
    } catch (error) {
      console.log(`   Error creating ObjectId: ${error.message}`);
    }
  }
});

// Test the exact data being sent
const testGoals = [
  { id: '688e040f148561ceaaf4741d', order: 1 },
  { id: '688e043e148561ceaaf4741e', order: 2 }
];

console.log('\nTesting reorder data format:');
testGoals.forEach((goal, index) => {
  console.log(`Goal ${index + 1}:`);
  console.log(`  ID: ${goal.id}`);
  console.log(`  Order: ${goal.order}`);
  console.log(`  ID Valid: ${ObjectId.isValid(goal.id)}`);
  console.log(`  Order Valid: ${typeof goal.order === 'number'}`);
});
