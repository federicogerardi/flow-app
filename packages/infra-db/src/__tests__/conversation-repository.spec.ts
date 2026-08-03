import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { KyselyConversationRepository } from '../repositories/conversation-repository.js';
import { Conversation, Message, AgentKey, ConversationStatus } from '@flow-app/domain';
import { createTestDb } from '../../test/setup.js';
import type { Kysely } from 'kysely';
import type { DB } from '../types.js';

describe('KyselyConversationRepository', () => {
  let db: Kysely<DB>;
  let repo: KyselyConversationRepository;

  beforeAll(async () => {
    db = createTestDb();
    repo = new KyselyConversationRepository(db);

    await db.insertInto('workspaces').values({
      id: '10000000-0000-0000-0000-000000000001',
      created_by: '20000000-0000-0000-0000-000000000001',
      name: 'Test Workspace',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();

    await db.insertInto('users').values({
      id: '20000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();

    await db.insertInto('users').values({
      id: '20000000-0000-0000-0000-000000000002',
      email: 'other@example.com',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();
  });

  beforeEach(async () => {
    await db.deleteFrom('messages').execute();
    await db.deleteFrom('conversations').execute();
  });

  describe('save() and findById()', () => {
    it('should persist conversation with messages', async () => {
      const conversation = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', AgentKey.Strategist);
      conversation.addMessage(Message.user(conversation.conversationId, 'Hello'));
      await repo.save(conversation);

      const found = await repo.findById(conversation.conversationId);
      expect(found).not.toBeNull();
      expect(found!.workspaceId).toBe('10000000-0000-0000-0000-000000000001');
      expect(found!.userId).toBe('20000000-0000-0000-0000-000000000001');
      expect(found!.agentKey).toBe(AgentKey.Strategist);
      expect(found!.messages).toHaveLength(1);
      expect(found!.messages[0].content).toBe('Hello');
    });
  });

  describe('findById()', () => {
    it('should return conversation with ordered messages', async () => {
      const conversation = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', AgentKey.Strategist);
      conversation.addMessage(Message.user(conversation.conversationId, 'First'));
      conversation.addMessage(Message.user(conversation.conversationId, 'Second'));
      conversation.addMessage(Message.user(conversation.conversationId, 'Third'));
      await repo.save(conversation);

      const found = await repo.findById(conversation.conversationId);
      expect(found!.messages).toHaveLength(3);
      expect(found!.messages[0].content).toBe('First');
      expect(found!.messages[1].content).toBe('Second');
      expect(found!.messages[2].content).toBe('Third');
    });
  });

  describe('findByUserAndWorkspace()', () => {
    it('should scope results to userId', async () => {
      const conv1 = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', AgentKey.Strategist);
      const conv2 = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', AgentKey.Strategist);
      conv1.addMessage(Message.user(conv1.conversationId, 'Hello'));
      conv2.addMessage(Message.user(conv2.conversationId, 'World'));
      await repo.save(conv1);
      await repo.save(conv2);

      const results = await repo.findByUserAndWorkspace('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe('20000000-0000-0000-0000-000000000001');
    });

    it('should return empty for different workspace', async () => {
      const conv = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', AgentKey.Strategist);
      conv.addMessage(Message.user(conv.conversationId, 'Hello'));
      await repo.save(conv);

      const results = await repo.findByUserAndWorkspace('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000099');
      expect(results).toHaveLength(0);
    });
  });

  describe('pagination', () => {
    it('should support limit and offset', async () => {
      const conv1 = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', AgentKey.Strategist);
      const conv2 = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', AgentKey.Copywriter);
      const conv3 = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', AgentKey.Analyst);
      await repo.save(conv1);
      await repo.save(conv2);
      await repo.save(conv3);

      const page1 = await repo.findByUserAndWorkspace('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', { limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await repo.findByUserAndWorkspace('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', { limit: 2, offset: 2 });
      expect(page2).toHaveLength(1);
    });
  });

  describe('archive', () => {
    it('should persist archived status', async () => {
      const conversation = Conversation.create('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', AgentKey.Strategist);
      conversation.addMessage(Message.user(conversation.conversationId, 'Hello'));
      await repo.save(conversation);

      conversation.archive();
      await repo.save(conversation);

      const found = await repo.findById(conversation.conversationId);
      expect(found!.status).toBe(ConversationStatus.Archived);
      expect(found!.status.isArchived).toBe(true);
    });
  });
});
