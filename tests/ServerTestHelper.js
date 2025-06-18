/* istanbul ignore file */
const ServerTestHelper = {
  async generateAccessToken(server) {
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const userPayload = {
      username: `testuser_${uniqueId}`,
      password: 'secretPassword',
      fullname: 'Test User',
    };

    const responseAddUser = await server.inject({
      method: 'POST',
      url: '/users',
      payload: userPayload,
    });

    const responseData = JSON.parse(responseAddUser.payload);
    const owner = responseData.data.addedUser?.id || responseData.data?.id;
    if (!owner) {
      throw new Error(`Could not extract owner ID from response: ${JSON.stringify(responseData, null, 2)}`);
    }

    const authPayload = {
      username: userPayload.username,
      password: userPayload.password,
    };

    const responseAuth = await server.inject({
      method: 'POST',
      url: '/authentications',
      payload: authPayload,
    });

    const { accessToken } = (JSON.parse(responseAuth.payload)).data;

    return { accessToken, owner };
  },
};

module.exports = ServerTestHelper;