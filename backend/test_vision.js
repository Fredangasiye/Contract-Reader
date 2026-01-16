const axios = require('axios');

const GOOGLE_CLOUD_VISION_API_KEY = 'AIzaSyCmlDHu67Sur6rOmPmw6DpruNPIDQx1oS4';

async function testVision() {
    console.log('Testing Google Cloud Vision API key...');
    try {
        const response = await axios.post(
            `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
            {
                requests: [
                    {
                        image: { content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' },
                        features: [{ type: 'TEXT_DETECTION' }]
                    }
                ]
            }
        );
        console.log('Success! Vision response received.');
    } catch (err) {
        console.error('Vision test failed:', err.response?.status, err.response?.data || err.message);
    }
}

testVision();
