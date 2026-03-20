package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSSubscriptionsHandler handles GET /v1/maas/subscriptions
func (app *App) MaaSSubscriptionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get model_id from query parameters
	modelID := r.URL.Query().Get("model_id")
	if modelID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model_id query parameter is required"))
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	apiKey := app.getMaaSTokenForModel(ctx, k8sClient, identity, namespace, "list-subscriptions")

	subscriptions, err := app.repositories.MaaSModels.ListSubscriptions(ctx, apiKey, modelID)
	if err != nil {
		app.handleMaaSClientError(w, r, err)
		return
	}

	response := models.MaaSSubscriptionsResponse{
		Object: "list",
		Data:   subscriptions,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
