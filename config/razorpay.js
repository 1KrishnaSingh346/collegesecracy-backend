// import Razorpay from 'razorpay';

// const razorpay = new Razorpay({
//   key_id: process.env.ENV_MODE === 'production' 
//     ? process.env.RAZORPAY_KEY_ID 
//     : process.env.RAZORPAY_TEST_KEY_ID,
//   key_secret: process.env.ENV_MODE === 'production'
//     ? process.env.RAZORPAY_KEY_SECRET
//     : process.env.RAZORPAY_TEST_KEY_SECRET
// });

// export default razorpay;

import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_TEST_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export default razorpay;
