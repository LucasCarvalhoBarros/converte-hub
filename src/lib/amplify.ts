import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_gjnrnWUeM",
      userPoolClientId: "461g5kj87m78cevjqgon7cnk8c",
      loginWith: {
        username: true,
        email: true,
      },
    },
  },
});
