import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function checkQuota() {
  try {
    console.log('Checking OpenAI API quota and account status...\n');
    
    // Try a simple API call to check if we can make requests
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Use smaller model for testing
      input: 'test'
    });
    
    console.log('✅ API is working! Successfully created embedding.');
    console.log(`Embedding dimension: ${response.data[0].embedding.length}`);
    
    // Usage information is not available via the current OpenAI SDK
    console.log('ℹ️  Usage information can be checked at: https://platform.openai.com/usage');
    
  } catch (error: any) {
    console.error('❌ API Error:');
    console.error(`Status: ${error.status}`);
    console.error(`Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    
    if (error.status === 429) {
      console.log('\n🔍 This is a rate limit error. Possible causes:');
      console.log('1. You have exceeded your current quota');
      console.log('2. Your account needs billing information');
      console.log('3. You need to upgrade your plan');
      console.log('\n💡 Solutions:');
      console.log('1. Check your usage at: https://platform.openai.com/usage');
      console.log('2. Add billing information at: https://platform.openai.com/settings/organization/billing');
      console.log('3. Consider upgrading your plan');
    } else if (error.status === 401) {
      console.log('\n🔑 Authentication error. Check your API key.');
    } else if (error.status === 403) {
      console.log('\n🚫 Access forbidden. Your account may need verification or billing setup.');
    }
  }
}

checkQuota().catch(console.error);
