// Quick test script to verify RAG functionality
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing RAG Implementation...');

// Check if all required files exist
const requiredFiles = [
  'src/lib/db/pg/schema.pg.ts',
  'src/types/rag.ts',
  'src/lib/ai/rag/embedding.ts',
  'src/lib/ai/rag/service.ts',
  'src/app/api/rag/route.ts',
  'src/app/api/rag/actions.ts',
  'src/components/document-manager.tsx'
];

console.log('📁 Checking file structure...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing!`);
    allFilesExist = false;
  }
});

console.log('\n🔍 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['pgvector', 'react-dropzone'];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - Missing!`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('\n🎉 RAG implementation structure is complete!');
  console.log('🚀 Next steps:');
  console.log('   1. Visit http://localhost:3001');
  console.log('   2. Create or open a project');
  console.log('   3. Upload documents using the "Manage Documents" button');
  console.log('   4. Start chatting with your documents!');
} else {
  console.log('\n❌ Some components are missing. Please check the implementation.');
}
