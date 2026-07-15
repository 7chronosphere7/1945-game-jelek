using System.Collections.Generic;
using UnityEngine;

namespace SkyAssault.Core.Utilities
{
    /// <summary>
    /// ScriptableObject-based event channel that allows components to communicate without direct references.
    /// </summary>
    [CreateAssetMenu(fileName = "NewGameEvent", menuName = "Sky Assault/Events/Game Event")]
    public class GameEvent : ScriptableObject
    {
        private readonly List<GameEventListener> listeners = new List<GameEventListener>();

        /// <summary>
        /// Raises the event, notifying all active listeners.
        /// </summary>
        public void Raise()
        {
            for (int i = listeners.Count - 1; i >= 0; i--)
            {
                listeners[i].OnEventRaised();
            }
        }

        /// <summary>
        /// Registers an event listener to receive notifications.
        /// </summary>
        /// <param name="listener">The listener object to register.</param>
        public void RegisterListener(GameEventListener listener)
        {
            if (!listeners.Contains(listener))
            {
                listeners.Add(listener);
            }
        }

        /// <summary>
        /// Unregisters an event listener.
        /// </summary>
        /// <param name="listener">The listener object to unregister.</param>
        public void UnregisterListener(GameEventListener listener)
        {
            if (listeners.Contains(listener))
            {
                listeners.Remove(listener);
            }
        }
    }
}
