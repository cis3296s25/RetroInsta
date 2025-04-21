import React from 'react';
import CreatePostForm from '../CreatePostForm/CreatePostForm';
import './CreatePostPopup.css';

interface CreatePostPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onPostSubmit: (formData: any) => void;
}

const CreatePostPopup: React.FC<CreatePostPopupProps> = ({ isOpen, onClose, onPostSubmit }) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <CreatePostForm onPostSubmit={onPostSubmit} />
      </div>
    </div>
  );
};

export default CreatePostPopup; 