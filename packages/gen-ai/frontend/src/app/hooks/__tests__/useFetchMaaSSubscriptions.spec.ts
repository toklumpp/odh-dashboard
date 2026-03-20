// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { waitFor } from '@testing-library/react';
import { useFetchState } from 'mod-arch-core';
import useFetchMaaSSubscriptions from '~/app/hooks/useFetchMaaSSubscriptions';
import { getMaaSSubscriptions } from '~/app/services/llamaStackService';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { MaaSSubscription } from '~/app/types';

// Mock utilities/const to avoid asEnumMember error
jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

// Mock mod-arch-core to avoid React context issues
jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
  NotReadyError: class NotReadyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotReadyError';
    }
  },
}));

// Mock the llamaStackService
jest.mock('~/app/services/llamaStackService', () => ({
  getMaaSSubscriptions: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetMaaSSubscriptions = jest.mocked(getMaaSSubscriptions);

const mockSubscriptions: MaaSSubscription[] = [
  {
    id: 'sub-test-basic',
    name: 'Basic Subscription',
    description: 'Basic tier subscription',
    // eslint-disable-next-line camelcase
    model_id: 'test-model-id',
    active: true,
  },
  {
    id: 'sub-test-premium',
    name: 'Premium Subscription',
    description: 'Premium tier subscription',
    // eslint-disable-next-line camelcase
    model_id: 'test-model-id',
    active: true,
  },
  {
    id: 'sub-test-enterprise',
    name: 'Enterprise Subscription',
    description: 'Enterprise tier subscription',
    // eslint-disable-next-line camelcase
    model_id: 'test-model-id',
    active: false,
  },
];

describe('useFetchMaaSSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when modelID is not provided', async () => {
    const mockRefresh = jest.fn();
    mockUseFetchState.mockReturnValue([[], true, undefined, mockRefresh]);

    const { result } = testHook(useFetchMaaSSubscriptions)('');

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toEqual([]);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should fetch subscriptions successfully when modelID is provided', async () => {
    const mockRefresh = jest.fn();
    mockGetMaaSSubscriptions.mockReturnValue(
      jest.fn().mockResolvedValue({
        object: 'list',
        data: mockSubscriptions,
      }),
    );
    mockUseFetchState.mockReturnValue([mockSubscriptions, true, undefined, mockRefresh]);

    const { result } = testHook(useFetchMaaSSubscriptions)('test-model-id');

    await waitFor(() => {
      const { data, loaded, error, refresh } = result.current;
      expect(data).toEqual(mockSubscriptions);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
      expect(refresh).toBe(mockRefresh);
    });
  });

  it('should return error when getMaaSSubscriptions API fails', async () => {
    const mockError = new Error('Failed to fetch subscriptions');
    mockGetMaaSSubscriptions.mockReturnValue(jest.fn().mockRejectedValue(mockError));
    mockUseFetchState.mockReturnValue([[], false, mockError, jest.fn()]);

    const { result } = testHook(useFetchMaaSSubscriptions)('test-model-id');

    await waitFor(() => {
      const { error } = result.current;
      expect(error?.message).toBe('Failed to fetch subscriptions');
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('should return empty array when no subscriptions are available', async () => {
    const mockRefresh = jest.fn();
    mockGetMaaSSubscriptions.mockReturnValue(
      jest.fn().mockResolvedValue({
        object: 'list',
        data: [],
      }),
    );
    mockUseFetchState.mockReturnValue([[], true, undefined, mockRefresh]);

    const { result } = testHook(useFetchMaaSSubscriptions)('test-model-id');

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toEqual([]);
      expect(loaded).toBe(true);
      expect(error).toBeUndefined();
    });
  });

  it('should handle loading state correctly', async () => {
    const mockRefresh = jest.fn();
    mockUseFetchState.mockReturnValue([[], false, undefined, mockRefresh]);

    const { result } = testHook(useFetchMaaSSubscriptions)('test-model-id');

    await waitFor(() => {
      const { data, loaded, error } = result.current;
      expect(data).toEqual([]);
      expect(loaded).toBe(false);
      expect(error).toBeUndefined();
    });
  });
});
