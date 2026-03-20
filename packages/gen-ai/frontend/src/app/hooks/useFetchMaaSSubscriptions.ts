import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  APIOptions,
  NotReadyError,
} from 'mod-arch-core';
import { MaaSSubscription } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchMaaSSubscriptions = (modelID: string): FetchStateObject<MaaSSubscription[]> => {
  const { api, apiAvailable } = useGenAiAPI();

  const fetchMaaSSubscriptions = React.useCallback<FetchStateCallbackPromise<MaaSSubscription[]>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }

      if (!modelID) {
        return [];
      }

      // eslint-disable-next-line camelcase
      const rawData = await api.getMaaSSubscriptions({ model_id: modelID }, opts);
      // Ensure we always return an array, even if API returns null
      return Array.isArray(rawData) ? rawData : [];
    },
    [api, apiAvailable, modelID],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchMaaSSubscriptions, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchMaaSSubscriptions;
