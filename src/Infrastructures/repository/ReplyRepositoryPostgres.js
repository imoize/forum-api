const NotFoundError = require('../../Commons/exceptions/NotFoundError');
const AuthorizationError = require('../../Commons/exceptions/AuthorizationError');
const AddedReply = require('../../Domains/replies/entities/AddedReply');
const ReplyRepository = require('../../Domains/replies/ReplyRepository');

class ReplyRepositoryPostgres extends ReplyRepository {
  constructor(pool, idGenerator) {
    super();
    this._pool = pool;
    this._idGenerator = idGenerator;
  }

  async addReply(replyData) {
    const { commentId, content, owner } = replyData;
    const id = `reply-${this._idGenerator()}`;

    const query = {
      text: 'INSERT INTO replies VALUES($1, $2, $3, $4) RETURNING id, content, owner',
      values: [id, content, owner, commentId],
    };

    const result = await this._pool.query(query);

    return new AddedReply({ ...result.rows[0] });
  }

  async verifyAvailableReplyById(replyId) {
    const query = {
      text: 'SELECT id FROM replies WHERE id = $1 AND is_delete = false',
      values: [replyId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('balasan tidak tersedia');
    }
  }

  async verifyReplyByOwner(replyId, owner) {
    const query = {
      text: 'SELECT id FROM replies WHERE id = $1 AND owner = $2',
      values: [replyId, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new AuthorizationError('anda tidak berhak mengakses resource ini');
    }
  }

  async getRepliesByThreadId(threadId) {
    const query = {
      text: `SELECT replies.id, users.username, replies.date, replies.content, replies.comment_id, replies.is_delete
              FROM replies
              LEFT JOIN users ON (replies.owner = users.id)
              LEFT JOIN comments ON (replies.comment_id = comments.id)
              WHERE comments.thread_id = $1
              ORDER BY replies.date ASC`,
      values: [threadId],
    };

    const result = await this._pool.query(query);

    return result.rows.map((row) => ({
      ...row,
      date: row.date.toISOString(),
    }));
  }

  async softDeleteReplyById(replyId) {
    const query = {
      text: 'UPDATE replies SET is_delete = TRUE WHERE id = $1',
      values: [replyId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('balasan tidak ditemukan atau sudah dihapus');
    }
  }
}

module.exports = ReplyRepositoryPostgres;