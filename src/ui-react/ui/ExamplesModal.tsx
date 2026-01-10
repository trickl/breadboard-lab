import React from 'react';
import { EXAMPLE_CIRCUITS, type ExampleCircuit } from '@/examples';

export interface ExamplesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExample: (example: ExampleCircuit) => void;
}

export const ExamplesModal: React.FC<ExamplesModalProps> = ({
  visible,
  onClose,
  onSelectExample,
}) => {
  if (!visible) return null;

  return (
    <div
      id="examples-modal"
      className="modal-overlay visible"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal modal-large">
        <div className="modal-header">
          <h2>Examples</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close examples">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="list-container" role="list">
            {EXAMPLE_CIRCUITS.map((example) => (
              <div
                key={example.id}
                className="list-item"
                data-example-id={example.id}
                role="listitem"
                tabIndex={0}
                onClick={() => onSelectExample(example)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectExample(example);
                  }
                }}
              >
                <div className="list-item-title">
                  {example.name}
                  <span className={`list-item-badge ${example.category}`}>{example.category}</span>
                </div>
                <div className="list-item-description">{example.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
