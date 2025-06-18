const pool = require('../../database/postgres/pool');
const NotFoundError = require('../../../Commons/exceptions/NotFoundError');
const AuthorizationError = require('../../../Commons/exceptions/AuthorizationError');
const AddReply = require('../../../Domains/replies/entities/AddReply');
const AddedReply = require('../../../Domains/replies/entities/AddedReply');
const ReplyRepositoryPostgres = require('../ReplyRepositoryPostgres');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const RepliesTableTestHelper = require('../../../../tests/RepliesTableTestHelper');

describe('ReplyRepositoryPostgres', () => {
  afterAll(async () => {
    await UsersTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await RepliesTableTestHelper.cleanTable();
    await pool.end();
  });

  afterEach(async () => {
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await RepliesTableTestHelper.cleanTable();
  });


  describe('verifyAvailableReplyById function', () => {
    it('should throw NotFoundError if reply not available', async () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool);
      const replyId = 'reply-999';

      // Action & Assert
      await expect(replyRepositoryPostgres.verifyAvailableReplyById(replyId))
        .rejects.toThrow(NotFoundError);
    });

    it('should not throw NotFoundError if comment available', async () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool);
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });
      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });
      const replyId = 'reply-123';
      await RepliesTableTestHelper.addReply({ id: replyId, replyId, owner: userId });

      // Action & Assert
      await expect(replyRepositoryPostgres.verifyAvailableReplyById(replyId))
        .resolves.not.toThrow(NotFoundError);
    });
  });

  describe('addReply function', () => {
    it('should return added reply correctly', async () => {
      // Arrange
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });
      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });

      const addReply = new AddReply({
        commentId,
        content: 'sebuah balasan',
        owner: userId,
      });

      const fakeIdGenerator = () => '123';
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool, fakeIdGenerator);

      // Action
      const addedReply = await replyRepositoryPostgres.addReply(addReply);

      // Assert
      const replies = await RepliesTableTestHelper.findReplyById(addedReply.id);
      expect(replies).toHaveLength(1);
      expect(addedReply).toStrictEqual(new AddedReply({
        id: `reply-${fakeIdGenerator()}`,
        content: addReply.content,
        owner: addReply.owner,
      }));
    });
  });

  describe('verifyReplyByOwner function', () => {
    it('should throw AuthorizationError if owner is not valid', async () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool);
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });
      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });
      const replyId = 'reply-123';
      await RepliesTableTestHelper.addReply({ id: replyId, commentId, owner: userId });
      const inValidUserId = 'user-986';

      // Action & Assert
      await expect(replyRepositoryPostgres.verifyReplyByOwner(replyId, inValidUserId))
        .rejects.toThrow(AuthorizationError);
    });

    it('should not throw AuthorizationError if owner is valid', async () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool);
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });
      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });
      const replyId = 'reply-123';
      await RepliesTableTestHelper.addReply({ id: replyId, commentId, owner: userId });

      // Action & Assert
      await expect(replyRepositoryPostgres.verifyReplyByOwner(replyId, userId))
        .resolves.not.toThrow(AuthorizationError);
    });
  });

  describe('getRepliesByThreadId function', () => {
    it('should get replies by threadId correctly', async () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool);
      const userPayload = {
        id: 'user-123',
        username: 'user123',
      };
      await UsersTableTestHelper.addUser(userPayload);
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userPayload.id });
      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userPayload.id });

      const replyPayload = {
        id: 'reply-123',
        commentId,
        content: 'sebuah balasan',
        owner: userPayload.id,
      };

      await RepliesTableTestHelper.addReply(replyPayload);

      // Action
      const repliesResult = await replyRepositoryPostgres.getRepliesByThreadId(threadId);

      // Assert
      expect(repliesResult).toBeDefined();
      expect(repliesResult).toHaveLength(1);
      expect(repliesResult[0].id).toEqual(replyPayload.id);
      expect(repliesResult[0].content).toEqual(replyPayload.content);
      expect(repliesResult[0].username).toEqual(userPayload.username);
      expect(repliesResult[0].comment_id).toEqual(replyPayload.commentId);
      expect(repliesResult[0].is_delete).toBe(false);

      expect(repliesResult[0]).toHaveProperty('date');
      expect(typeof repliesResult[0].date).toBe('string');
      expect(repliesResult[0]).toHaveProperty('is_delete');
      expect(typeof repliesResult[0].is_delete).toBe('boolean');
    });

    it('should get empty array when replies by threadId is empty', async () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool);
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });

      // Action
      const repliesResult = await replyRepositoryPostgres.getRepliesByThreadId(threadId);

      // Assert
      expect(repliesResult).toBeDefined();
      expect(repliesResult).toHaveLength(0);
    });
  });

  describe('softDeleteReplyById function', () => {
    it('should throw NotFoundError when reply not found or invalid', () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool);

      // Action & Assert
      return expect(replyRepositoryPostgres.softDeleteReplyById('reply-999'))
        .rejects
        .toThrowError(NotFoundError);
    });

    it('should return delete reply correctly', async () => {
      // Arrange
      const replyRepositoryPostgres = new ReplyRepositoryPostgres(pool);
      const userId = 'user-123';
      await UsersTableTestHelper.addUser({ id: userId });
      const threadId = 'thread-123';
      await ThreadsTableTestHelper.addThread({ id: threadId, owner: userId });
      const commentId = 'comment-123';
      await CommentsTableTestHelper.addComment({ id: commentId, threadId, owner: userId });
      const replyId = 'reply-123';
      await RepliesTableTestHelper.addReply({ id: replyId, commentId, owner: userId });

      // Action
      await replyRepositoryPostgres.softDeleteReplyById(replyId);

      // Assert
      const replyResult = await RepliesTableTestHelper.findReplyById(replyId);
      expect(replyResult).toBeDefined();
      expect(replyResult).toHaveLength(1);
      expect(replyResult[0].is_delete).toEqual(true);
    });
  });
});