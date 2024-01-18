import { useCallback } from 'react';
import { Frequency, SupportedNetwork, SupportedNetworkNames } from '../../models/constants';
import { calculateFlowRate } from '../../lib/calculateFlowRate';
import { GoodCollectiveSDK } from '@gooddollar/goodcollective-sdk';
import { useAccount, useNetwork } from 'wagmi';
import { useEthersSigner } from '../useEthersSigner';
import useCrossNavigate from '../../routes/useCrossNavigate';
import { printAndParseSupportError, validateConnection } from './util';

export function useSupportFlow(
  collective: string,
  currencyDecimals: number,
  decimalAmountIn: number,
  duration: number,
  frequency: Frequency,
  onError: (error: string) => void,
  toggleCompleteDonationModal: (value: boolean) => void
) {
  const { address: maybeAddress } = useAccount();
  const { chain } = useNetwork();
  const maybeSigner = useEthersSigner({ chainId: chain?.id });
  const { navigate } = useCrossNavigate();

  return useCallback(async () => {
    const validation = validateConnection(maybeAddress, chain?.id, maybeSigner);
    if (typeof validation === 'string') {
      onError(validation);
      return;
    }
    const { address, chainId, signer } = validation;

    const flowRate = calculateFlowRate(decimalAmountIn, duration, frequency, currencyDecimals);
    if (!flowRate) {
      onError('Failed to calculate flow rate.');
      return;
    }

    const chainIdString = chainId.toString() as `${SupportedNetwork}`;
    const network = SupportedNetworkNames[chainId as SupportedNetwork];

    try {
      const sdk = new GoodCollectiveSDK(chainIdString, signer.provider, { network });
      toggleCompleteDonationModal(true);
      const tx = await sdk.supportFlow(signer, collective, flowRate);
      await tx.wait();
      navigate(`/profile/${address}`);
      return;
    } catch (error) {
      toggleCompleteDonationModal(false);
      const message = printAndParseSupportError(error);
      onError(message);
    }
  }, [
    maybeAddress,
    chain?.id,
    collective,
    currencyDecimals,
    decimalAmountIn,
    duration,
    frequency,
    navigate,
    onError,
    maybeSigner,
    toggleCompleteDonationModal,
  ]);
}