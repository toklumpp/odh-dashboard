import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  FormGroup,
  HelperText,
  HelperTextItem,
  Label,
  List,
  ListItem,
  MenuToggle,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { MinusCircleIcon, PencilAltIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { PLAYGROUND_MULTIMODAL_EVENTS } from '~/app/tracking/playgroundMultimodalTrackingConstants';
import { AIModel } from '~/app/types';
import useASRModels from '~/app/hooks/useASRModels';
import { convertMaaSModelToAIModel, getLlamaModelDisplayName } from '~/app/utilities';
import SubscriptionDropdown from '~/app/Chatbot/components/SubscriptionDropdown';
import {
  useChatbotConfigStore,
  selectSelectedAsrModel,
  selectSelectedAsrSubscription,
  selectIsAsrModelEnabled,
  selectSelectedModel,
} from '~/app/Chatbot/store';

interface TranscriptionModelSectionProps {
  configId: string;
}

const TranscriptionModelSection: React.FunctionComponent<TranscriptionModelSectionProps> = ({
  configId,
}) => {
  const { aiModels, aiModelsLoaded, maasModels, maasModelsLoaded } =
    React.useContext(ChatbotContext);
  const allModels = React.useMemo(
    () => [...aiModels, ...maasModels.map(convertMaaSModelToAIModel)],
    [aiModels, maasModels],
  );
  const asrModels = useASRModels(allModels);

  const selectedAsrModel = useChatbotConfigStore(selectSelectedAsrModel(configId));
  const selectedAsrSubscription = useChatbotConfigStore(selectSelectedAsrSubscription(configId));
  const isAsrModelEnabled = useChatbotConfigStore(selectIsAsrModelEnabled(configId));
  const selectedMainModel = useChatbotConfigStore(selectSelectedModel(configId));

  const updateSelectedAsrModel = useChatbotConfigStore((s) => s.updateSelectedAsrModel);
  const updateSelectedAsrSubscription = useChatbotConfigStore(
    (s) => s.updateSelectedAsrSubscription,
  );
  const updateAsrModelEnabled = useChatbotConfigStore((s) => s.updateAsrModelEnabled);

  const [isOpen, setIsOpen] = React.useState(false);
  const [isAllModelsOpen, setIsAllModelsOpen] = React.useState(false);
  const [staleWarning, setStaleWarning] = React.useState(false);

  const selectContainerRef = React.useRef<HTMLDivElement>(null);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  const modelsLoaded = aiModelsLoaded && maasModelsLoaded;

  React.useEffect(() => {
    if (!isAsrModelEnabled || !modelsLoaded) {
      return;
    }

    // Stale: selected model no longer exists in the available list
    if (selectedAsrModel && !allModels.some((m) => m.model_id === selectedAsrModel)) {
      updateSelectedAsrModel(configId, '');
      setStaleWarning(true);
    }
  }, [
    isAsrModelEnabled,
    modelsLoaded,
    allModels,
    selectedAsrModel,
    configId,
    updateSelectedAsrModel,
  ]);

  const handleEnable = React.useCallback(() => {
    updateAsrModelEnabled(configId, true);
    requestAnimationFrame(() => {
      const toggle = selectContainerRef.current?.querySelector<HTMLButtonElement>(
        '[data-testid="asr-model-selector-toggle"]',
      );
      toggle?.focus();
    });
  }, [configId, updateAsrModelEnabled]);

  const handleRemove = React.useCallback(() => {
    updateAsrModelEnabled(configId, false);
    updateSelectedAsrModel(configId, '');
    setStaleWarning(false);
    requestAnimationFrame(() => {
      addButtonRef.current?.focus();
    });
  }, [configId, updateAsrModelEnabled, updateSelectedAsrModel]);

  const handleSelect = React.useCallback(
    (
      _event: React.MouseEvent<Element, MouseEvent> | undefined,
      value: string | number | undefined,
    ) => {
      if (typeof value === 'string') {
        updateSelectedAsrModel(configId, value);
        setStaleWarning(false);
        const model = allModels.find((m) => m.model_id === value);
        fireMiscTrackingEvent(PLAYGROUND_MULTIMODAL_EVENTS.ASR_MODEL_SELECTED, {
          modelName: model?.display_name || value,
          isDefaultModel: false,
        });
      }
      setIsOpen(false);
      setIsAllModelsOpen(false);
    },
    [configId, updateSelectedAsrModel, allModels],
  );

  const getSelectedDisplayName = (models: AIModel[], modelId: string): string => {
    const model = models.find((m) => m.model_id === modelId);
    return model?.display_name || modelId;
  };

  if (!modelsLoaded) {
    return (
      <div data-testid="transcription-model-loading">
        <Spinner size="md" aria-label="Loading transcription models" />
      </div>
    );
  }

  const toggleLabel = selectedAsrModel
    ? getSelectedDisplayName(allModels, selectedAsrModel)
    : 'Select a transcription model';

  const mainModelDisplayName = selectedMainModel
    ? getLlamaModelDisplayName(selectedMainModel, aiModels)
    : '';

  const helperContent = (() => {
    if (staleWarning) {
      return (
        <HelperTextItem variant="warning">
          Previously selected model is no longer available.
        </HelperTextItem>
      );
    }
    if (selectedAsrModel && mainModelDisplayName) {
      return (
        <HelperTextItem>
          Audio is transcribed to text, then sent to {mainModelDisplayName}.
        </HelperTextItem>
      );
    }
    return null;
  })();

  const allModelsModal = (
    <Modal isOpen={isAllModelsOpen} onClose={() => setIsAllModelsOpen(false)} variant="medium">
      <ModalHeader title="Select transcription model" />
      <ModalBody>
        <List isPlain>
          {[...asrModels, ...allModels.filter((m) => !asrModels.includes(m))].map((model) => (
            <ListItem key={model.model_id}>
              <Button
                variant="link"
                onClick={() => {
                  updateAsrModelEnabled(configId, true);
                  handleSelect(undefined, model.model_id);
                }}
                data-testid={`all-model-option-${model.model_id}`}
              >
                {model.display_name || model.model_id}
              </Button>{' '}
              {asrModels.includes(model) && <Label color="blue">Recommended</Label>}
            </ListItem>
          ))}
        </List>
      </ModalBody>
    </Modal>
  );

  if (!isAsrModelEnabled) {
    return (
      <>
        <div className="pf-v6-u-p-md pf-v6-u-mt-md" data-testid="transcription-model-add-section">
          <Title headingLevel="h3" size="md">
            Transcription model
          </Title>
          {asrModels.length > 0 ? (
            <Button
              ref={addButtonRef}
              variant="link"
              icon={<PlusCircleIcon />}
              onClick={handleEnable}
              data-testid="add-transcription-model-btn"
            >
              Add audio transcription model
            </Button>
          ) : (
            <EmptyState headingLevel="h4" titleText="No models tagged for audio transcription">
              <EmptyStateBody>
                To enable audio transcription, tag a model with the audio capability in{' '}
                <Link to="/ai-hub/models/registry">Model registry</Link>.
              </EmptyStateBody>
              <EmptyStateFooter>
                <Button variant="link" onClick={() => setIsAllModelsOpen(true)}>
                  View all models to select one manually
                </Button>
              </EmptyStateFooter>
            </EmptyState>
          )}
        </div>
        {allModelsModal}
      </>
    );
  }

  return (
    <FormGroup
      fieldId="asr-model-selector"
      label="Transcription model"
      labelHelp={
        <FieldGroupHelpLabelIcon content="Transcribes audio files to text before sending to the chat model." />
      }
      className="pf-v6-u-mt-md"
    >
      <div ref={selectContainerRef}>
        <Select
          id="asr-model-selector"
          isOpen={isOpen}
          selected={selectedAsrModel || undefined}
          onSelect={handleSelect}
          onOpenChange={setIsOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsOpen(!isOpen)}
              isExpanded={isOpen}
              isDisabled={asrModels.length === 0}
              isFullWidth
              data-testid="asr-model-selector-toggle"
              aria-label="Select a transcription model"
            >
              {toggleLabel}
            </MenuToggle>
          )}
        >
          <SelectList>
            {asrModels.map((model) => (
              <SelectOption
                key={model.model_id}
                value={model.model_id}
                data-testid={`asr-model-option-${model.model_id}`}
              >
                {model.display_name || model.model_id}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      </div>
      <Button
        variant="link"
        isInline
        icon={selectedAsrModel && asrModels.length === 0 ? <PencilAltIcon /> : undefined}
        onClick={() => setIsAllModelsOpen(true)}
      >
        {selectedAsrModel && asrModels.length === 0
          ? 'Edit transcription model'
          : 'View all models'}
      </Button>
      {selectedAsrModel &&
        allModels.find((m) => m.model_id === selectedAsrModel)?.model_source_type === 'maas' && (
          <SubscriptionDropdown
            selectedModel={selectedAsrModel}
            selectedSubscription={selectedAsrSubscription}
            onSubscriptionChange={(sub) => updateSelectedAsrSubscription(configId, sub)}
            isMaaSModel
            label="Transcription subscription"
            helpText="Select the subscription to use for the transcription model. This controls access and rate limits for audio transcription."
            className="pf-v6-u-mt-sm"
          />
        )}
      <div aria-live="polite" aria-atomic="true">
        {helperContent && <HelperText className="pf-v6-u-mt-xs">{helperContent}</HelperText>}
      </div>
      <Button
        variant="link"
        icon={<MinusCircleIcon />}
        onClick={handleRemove}
        className="pf-v6-u-mt-sm"
        data-testid="remove-transcription-model-btn"
        aria-label="Remove transcription model"
        isDisabled={false}
      >
        Remove
      </Button>
      {allModelsModal}
    </FormGroup>
  );
};

export default TranscriptionModelSection;
