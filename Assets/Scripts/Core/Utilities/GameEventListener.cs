using UnityEngine;
using UnityEngine.Events;

namespace SkyAssault.Core.Utilities
{
    /// <summary>
    /// MonoBehaviour component that listens to a GameEvent and triggers a UnityEvent in response.
    /// </summary>
    public class GameEventListener : MonoBehaviour
    {
        [Tooltip("Event to register with.")]
        [SerializeField] private GameEvent gameEvent;

        [Tooltip("Response to invoke when the event is raised.")]
        [SerializeField] private UnityEvent response;

        private void OnEnable()
        {
            if (gameEvent != null)
            {
                gameEvent.RegisterListener(this);
            }
        }

        private void OnDisable()
        {
            if (gameEvent != null)
            {
                gameEvent.UnregisterListener(this);
            }
        }

        /// <summary>
        /// Called by the GameEvent when it is raised.
        /// </summary>
        public void OnEventRaised()
        {
            response?.Invoke();
        }
    }
}
