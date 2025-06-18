const AddReply = require('../../Domains/replies/entities/AddReply');

class AddReplyUseCase {
  constructor({ replyRepository, commentRepository, threadRepository }) {
    this._threadRepository = threadRepository;
    this._commentRepository = commentRepository;
    this._replyRepository = replyRepository;
  }

  async execute(useCasePayload) {
    const addReply = new AddReply(useCasePayload);
    await this._threadRepository.verifyAvailableThreadById(useCasePayload.threadId);
    await this._commentRepository.verifyAvailableCommentById(useCasePayload.commentId);
    return this._replyRepository.addReply(addReply);
  }
}

module.exports = AddReplyUseCase;