const pool = require('../../database/postgres/pool');
const container = require('../../container');
const createServer = require('../createServer');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const ServerTestHelper = require('../../../../tests/ServerTestHelper');

describe('/threads/{threadId}/comments endpoint', () => {
  afterAll(async () => {
    await UsersTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await pool.end();
  });

  afterEach(async () => {
    await UsersTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
  });

  describe('POST /threads/{threadId}/comments', () => {
    it('should response 201 and persisted comment', async () => {
      // Arrange
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const server = await createServer(container);
      const { accessToken, owner } = await ServerTestHelper.generateAccessToken(server);

      const commentPayload = {
        content: 'sebuah comment',
      };

      // Action
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: commentPayload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(201);
      expect(responseJson.status).toEqual('success');
      expect(responseJson.data.addedComment).toBeDefined();
      expect(responseJson.data.addedComment.content).toEqual(commentPayload.content);
      expect(responseJson.data.addedComment.owner).toEqual(owner);
    });

    it('should response 400 when request payload not contain needed property', async () => {
      // Arrange
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const server = await createServer(container);
      const { accessToken } = await ServerTestHelper.generateAccessToken(server);

      const commentPayload = {};

      // Action
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: commentPayload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(400);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('tidak dapat membuat komentar karena properti yang dibutuhkan tidak lengkap');
    });

    it('should response 400 when request payload not meet data type specification', async () => {
      // Arrange
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const server = await createServer(container);
      const { accessToken } = await ServerTestHelper.generateAccessToken(server);

      const commentPayload = {
        content: ['sebuah comment'],
      };

      // Action
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: commentPayload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(400);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toEqual('tidak dapat membuat komentar karena tipe data tidak sesuai');
    });

    it('should response 401 status code when add comment without authentication', async () => {
      // Arrange
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const server = await createServer(container);

      const commentPayload = {
        content: 'sebuah comment',
      };

      // Action
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: commentPayload,
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(401);
      expect(responseJson.message).toEqual('Missing authentication');
    });
  });

  describe('DELETE /threads/{threadId}/comments/{commentId}', () => {
    it('should response 200 when comment is successfully deleted', async () => {
      // Arrange
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const server = await createServer(container);
      const { accessToken, owner } = await ServerTestHelper.generateAccessToken(server);

      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner });

      // Action
      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(200);
      expect(responseJson.status).toEqual('success');
    });

    it('should response 401 status code when delete comment without authentication', async () => {
      // Arrange
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId });

      const server = await createServer(container);

      // Action
      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}`,
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(401);
      expect(responseJson.message).toEqual('Missing authentication');
    });

    it('should response 403 status code when user is not the owner of the comment', async () => {
      // Arrange
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      const otherCommentOwner = 'user-987';
      await UsersTableTestHelper.addUser({ id: otherCommentOwner, username: 'user987' });
      const commentId = 'comment-986';
      await CommentsTableTestHelper.addComment(
        {
          id: commentId, threadId, owner: otherCommentOwner,
        },
      );

      const server = await createServer(container);
      const { accessToken } = await ServerTestHelper.generateAccessToken(server);

      // Action
      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(403);
      expect(responseJson.message).toEqual('anda tidak berhak mengakses resource ini');
    });

    it('should response 404 status code when thread or comment is not present or is not valid', async () => {
      // Arrange
      const invalidThreadId = 'thread-999';
      const invalidCommentId = 'comment-999';

      const server = await createServer(container);
      const { accessToken } = await ServerTestHelper.generateAccessToken(server);

      // Action
      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${invalidThreadId}/comments/${invalidCommentId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Assert
      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(404);
      expect(responseJson.message).toBeDefined();
    });
  });
});