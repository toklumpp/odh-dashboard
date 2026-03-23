import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  ClipboardCopy,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { AIModel } from '~/app/types';
import useGenerateMaaSToken from '~/app/hooks/useGenerateMaaSToken';
import useFetchMaaSSubscriptions from '~/app/hooks/useFetchMaaSSubscriptions';
import { copyToClipboardWithTracking } from '~/app/utilities/utils';
import { maasTokensPath } from '~/app/utilities/routes';

type EndpointDetailModalProps = {
  model: AIModel;
  onClose: () => void;
};

const EndpointDetailModal: React.FC<EndpointDetailModalProps> = ({ model, onClose }) => {
  const hasExternal = !!model.externalEndpoint;
  const hasInternal = !!model.internalEndpoint;
  const isMaaS = model.model_source_type === 'maas';

  const { isGenerating, tokenData, error, generateToken, resetToken } = useGenerateMaaSToken();

  // Fetch subscriptions for MaaS models
  const {
    data: subscriptions,
    loaded: subscriptionsLoaded,
    error: subscriptionsError,
  } = useFetchMaaSSubscriptions(isMaaS ? model.model_id : '');

  const [selectedSubscription, setSelectedSubscription] = React.useState<string>('');

  // Set the first active subscription as default when data loads
  React.useEffect(() => {
    if (subscriptionsLoaded && subscriptions.length > 0 && !selectedSubscription) {
      const activeSubscription = subscriptions.find((sub) => sub.active);
      if (activeSubscription) {
        setSelectedSubscription(activeSubscription.id);
      }
    }
  }, [subscriptions, subscriptionsLoaded, selectedSubscription]);

  const handleEndpointCopy = (endpoint: string, endpointType: 'external' | 'internal') =>
    copyToClipboardWithTracking(endpoint, 'Available Endpoints Endpoint Copied', {
      assetType: isMaaS ? 'maas_model' : 'model',
      endpointType,
      copyTarget: 'endpoint',
    });

  const handleClose = () => {
    resetToken();
    onClose();
  };

  return (
    <Modal isOpen onClose={handleClose} variant={ModalVariant.medium} aria-label="Endpoints">
      <ModalHeader title="Endpoints" />
      <ModalBody>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
          <FlexItem>
            <Content component={ContentVariants.p}>
              Use this endpoint to connect your application to this model. Copy the endpoint URL
              below along with the authentication details to start making requests.
            </Content>
          </FlexItem>

          {hasExternal && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    External API endpoint
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ClipboardCopy
                    isReadOnly
                    data-testid="endpoint-modal-external-url"
                    hoverTip="Copy URL"
                    clickTip="Copied"
                    aria-label={`External API endpoint URL for ${model.model_name}`}
                    onCopy={() => handleEndpointCopy(model.externalEndpoint ?? '', 'external')}
                  >
                    {model.externalEndpoint ?? ''}
                  </ClipboardCopy>
                </FlexItem>
                <FlexItem>
                  <Content
                    component={ContentVariants.small}
                    style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    Use this endpoint to access the model from outside the cluster.
                  </Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}

          {hasInternal && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Internal API endpoint
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ClipboardCopy
                    isReadOnly
                    data-testid="endpoint-modal-internal-url"
                    hoverTip="Copy URL"
                    clickTip="Copied"
                    aria-label={`Internal API endpoint URL for ${model.model_name}`}
                    onCopy={() => handleEndpointCopy(model.internalEndpoint ?? '', 'internal')}
                  >
                    {model.internalEndpoint ?? ''}
                  </ClipboardCopy>
                </FlexItem>
                <FlexItem>
                  <Content
                    component={ContentVariants.small}
                    style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    Use this endpoint to access the model from within the cluster.
                  </Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}

          {isMaaS && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    API token
                  </Content>
                </FlexItem>

                {!tokenData && (
                  <FlexItem>
                    <Button
                      data-testid="endpoint-modal-generate-api-key"
                      variant={ButtonVariant.secondary}
                      isDisabled={isGenerating}
                      onClick={() => generateToken()}
                      icon={isGenerating ? <Spinner size="sm" /> : undefined}
                    >
                      Generate API token
                    </Button>
                  </FlexItem>
                )}

                <FlexItem>
                  <Content component={ContentVariants.small}>
                    Or use any of your <Link to={maasTokensPath}>existing API keys</Link> to
                    authenticate requests to this model.
                  </Content>
                </FlexItem>

                {tokenData && (
                  <FlexItem>
                    <Flex
                      direction={{ default: 'column' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <Alert
                          variant={AlertVariant.info}
                          title="Important: Copy and store this token"
                          isInline
                          customIcon={<InfoCircleIcon />}
                        >
                          This token can be viewed only once, and will be unavailable after you
                          close this dialog.
                        </Alert>
                      </FlexItem>
                      <FlexItem>
                        <ClipboardCopy
                          data-testid="endpoint-modal-api-key-copy"
                          hoverTip="Copy"
                          clickTip="Copied"
                          aria-label="Generated MaaS API key"
                          onCopy={() =>
                            copyToClipboardWithTracking(
                              tokenData.key,
                              'Available Endpoints Service Token Copied',
                              {
                                assetType: 'maas_model',
                                copyTarget: 'service_token',
                              },
                            )
                          }
                        >
                          {tokenData.key}
                        </ClipboardCopy>
                      </FlexItem>
                    </Flex>
                  </FlexItem>
                )}

                {error && (
                  <FlexItem>
                    <Alert variant={AlertVariant.danger} title="Error generating API key" isInline>
                      {error}
                    </Alert>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
          )}

          {isMaaS && subscriptionsLoaded && subscriptions.length > 0 && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Subscription
                  </Content>
                </FlexItem>

                <FlexItem>
                  <Content component={ContentVariants.small}>
                    Include a subscription in your request to access this endpoint. Copy the header
                    name and value below.
                  </Content>
                </FlexItem>

                <FlexItem>
                  <FormGroup label="Available subscriptions" fieldId="subscription-select">
                    <FormSelect
                      value={selectedSubscription}
                      onChange={(_event, value) =>
                        setSelectedSubscription(typeof value === 'string' ? value : '')
                      }
                      aria-label="Select subscription"
                      data-testid="endpoint-modal-subscription-select"
                    >
                      <FormSelectOption
                        key="placeholder"
                        value=""
                        label="Select a subscription"
                        isDisabled
                      />
                      {subscriptions.map((sub) => (
                        <FormSelectOption
                          key={sub.id}
                          value={sub.id}
                          label={`${sub.name}${!sub.active ? ' (Inactive)' : ''}`}
                          isDisabled={!sub.active}
                        />
                      ))}
                    </FormSelect>
                  </FormGroup>
                </FlexItem>

                {selectedSubscription && (
                  <FlexItem>
                    <Flex
                      direction={{ default: 'column' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <ClipboardCopy
                          isReadOnly
                          data-testid="endpoint-modal-subscription-header"
                          hoverTip="Copy subscription header"
                          clickTip="Copied"
                          aria-label="Subscription header for curl command"
                          onCopy={() =>
                            copyToClipboardWithTracking(
                              `-H "x-subscription-id: ${selectedSubscription}"`,
                              'Available Endpoints Subscription Copied',
                              {
                                assetType: 'maas_model',
                                copyTarget: 'subscription_header',
                              },
                            )
                          }
                        >
                          {`-H "x-subscription-id: ${selectedSubscription}"`}
                        </ClipboardCopy>
                      </FlexItem>
                      <FlexItem>
                        <Content component={ContentVariants.small}>
                          This header is required when have access to more than one subscription.
                          You can find your subscription names. on the Playground page.
                        </Content>
                      </FlexItem>
                    </Flex>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
          )}

          {isMaaS && subscriptionsLoaded && subscriptions.length === 0 && (
            <FlexItem>
              <Alert
                variant={AlertVariant.info}
                title="No subscriptions available"
                isInline
                customIcon={<InfoCircleIcon />}
              >
                You don&apos;t have any active subscriptions for this model. Contact your
                administrator to request access.
              </Alert>
            </FlexItem>
          )}

          {isMaaS && subscriptionsError && (
            <FlexItem>
              <Alert variant={AlertVariant.warning} title="Unable to load subscriptions" isInline>
                {subscriptionsError.message}
              </Alert>
            </FlexItem>
          )}
        </Flex>
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="endpoint-modal-close"
          variant={ButtonVariant.primary}
          onClick={handleClose}
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EndpointDetailModal;
