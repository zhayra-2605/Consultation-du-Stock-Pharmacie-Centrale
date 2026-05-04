import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { authApi } from '../services/api';
import './Login.css';

const Login = ({ setToken }) => {
  const [matricule, setMatricule] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login', 'forgot', 'reset'
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const CustomInput = ({ label, icon, type, placeholder, value, onChange, required, maxLength, minLength, className }) => (
    <Form.Group className={`mb-3 form-icon-group ${className || ''}`}>
      <Form.Label>{label}</Form.Label>
      <div className="input-with-icon">
        <i className={`fas ${icon} input-icon`}></i>
        <Form.Control 
          type={type} 
          placeholder={placeholder} 
          value={value}
          onChange={onChange}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          className="ps-5"
        />
      </div>
    </Form.Group>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Si l'API nécessite l'email, on le passe ici
      const response = await authApi.login(matricule, password, email);
      const { token, role } = response.data;
      
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('role', role);
      
      setToken(token);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la connexion. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(matricule, email);
      setMessage(res.data.message);
      setMode('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la demande.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authApi.resetPassword(matricule, resetCode, newPassword);
      setMessage(res.data.message);
      setMode('login');
      setPassword('');
      setResetCode('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper split-layout">
      {/* ── Left Panel: Branding & Info ── */}
      <div className="login-left-panel">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        
        {/* ── Floating Medical Icons ── */}
        <div className="medical-floating-icons">
          <i className="fas fa-pills med-icon icon-1"></i>
          <i className="fas fa-prescription-bottle-alt med-icon icon-2"></i>
          <i className="fas fa-syringe med-icon icon-3"></i>
          <i className="fas fa-briefcase-medical med-icon icon-4"></i>
          <i className="fas fa-heartbeat med-icon icon-5"></i>
          <i className="fas fa-tablets med-icon icon-6"></i>
        </div>
      {/* ── Background Decorative Elements ── */}
      <div className="tunisia-flag-bg">
        <div className="glossy-flag-container">
          <img src="https://flagcdn.com/h240/tn.png" alt="Drapeau Tunisie" className="flag-img" />
          <div className="glossy-overlay"></div>
        </div>
      </div>

        <div className="left-panel-content">
          <div className="top-badges-container">
            <div className="system-status-badge">
              <div className="status-dot"></div>
              <span>Système Sécurisé & Connecté</span>
            </div>
          </div>

          <a href="http://www.phct.com.tn/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div className="banner-content">
               <img src="/assets/logo_pct_official.png" alt="Logo PCT" className="banner-logo" />
               <div className="banner-text">
                   <h2 className="banner-title-ar">الصيدلية المركزية التونسية</h2>
                   <h3 className="banner-title-fr">LA PHARMACIE CENTRALE DE TUNISIE</h3>
               </div>
               <div className="banner-iso">
                   <div className="iso-text">ISO<br/><span>9001-2008</span></div>
               </div>
            </div>
          </a>

          <div className="welcome-text-block">
            <h4>Portail National d'Analyse et de Prédiction</h4>
            <p>Une infrastructure technologique avancée permettant de monitorer en temps réel l'état des stocks, d'anticiper les ruptures et de garantir la sécurité sanitaire du pays grâce à l'Intelligence Artificielle.</p>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <i className="fas fa-chart-line" style={{ color: '#0d8262' }}></i>
              <span>Algorithmes Prédictifs</span>
            </div>
            <div className="feature-card">
              <i className="fas fa-shield-alt" style={{ color: '#3b82f6' }}></i>
              <span>Accès Sécurisé RBAC</span>
            </div>
            <div className="feature-card">
              <i className="fas fa-box" style={{ color: '#f59e0b' }}></i>
              <span>Gestion des Stocks IA</span>
            </div>
            <div className="feature-card">
              <i className="fas fa-project-diagram" style={{ color: '#8b5cf6' }}></i>
              <span>Réseau National</span>
            </div>
            <div className="feature-card">
              <i className="fas fa-pills" style={{ color: '#ec4899' }}></i>
              <span>Traçabilité Produits</span>
            </div>
            <div className="feature-card">
              <i className="fas fa-bell" style={{ color: '#ef4444' }}></i>
              <span>Alertes de Rupture</span>
            </div>
          </div>

          <div className="login-contact-info">
            <div className="contact-item">
              <i className="fas fa-map-marker-alt"></i>
              <span>51, Av. 10 Décembre 1948 - 1082, C. Mahrajène Tunis</span>
            </div>
            <div className="contact-item">
              <i className="fas fa-phone-alt"></i>
              <span>71 783 011  /  71 388 222</span>
            </div>
            <div className="contact-item">
              <i className="fas fa-fax"></i>
              <span>71 784 645</span>
            </div>
            <a href="https://www.facebook.com/PharmacieCentratraledeTunisie/" target="_blank" rel="noopener noreferrer" className="contact-item social-link">
              <i className="fab fa-facebook"></i>
              <span>Page Officielle Facebook</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="login-right-panel">
        <Container className="d-flex justify-content-center align-items-center w-100 p-4" style={{ flex: 1, zIndex: 10 }}>
          <Card className="login-card w-100 border-0" style={{ maxWidth: '420px' }}>
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <img src="/assets/logo_pct_official.png" alt="Pharmacie Centrale Logo" className="login-logo" />
                <h3 className="login-title">Pharmacie Centrale</h3>
                <p className="text-muted" style={{ fontWeight: 500 }}>Système d'Analyse et Prédiction</p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              {message && <Alert variant="success">{message}</Alert>}
              
              {mode === 'login' && (
                <Form onSubmit={handleSubmit}>
                  <CustomInput label="Matricule" icon="fa-id-badge" type="text" placeholder="Ex: M1001" value={matricule} onChange={(e) => setMatricule(e.target.value)} required />
                  <CustomInput label="E-mail" icon="fa-envelope" type="email" placeholder="Ex: email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <CustomInput label="Mot de passe" icon="fa-lock" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />

                  <div className="text-end mb-4">
                      <span 
                          className="forgot-link"
                          onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                      >
                          Mot de passe oublié ?
                      </span>
                  </div>

                  <div className="d-grid">
                    <Button variant="primary" type="submit" size="lg" disabled={loading} className="fw-bold">
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                  </div>
                </Form>
              )}

              {mode === 'forgot' && (
                <Form onSubmit={handleForgotPassword}>
                  <p className="text-muted small mb-3">Saisissez votre matricule et votre adresse e-mail. Un code de réinitialisation vous sera envoyé.</p>
                  <CustomInput label="Matricule" icon="fa-id-badge" type="text" placeholder="Ex: M1001" value={matricule} onChange={(e) => setMatricule(e.target.value)} required />
                  <CustomInput label="E-mail" icon="fa-envelope" type="email" placeholder="Ex: email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="mb-4" />

                  <div className="d-grid gap-2">
                    <Button variant="primary" type="submit" size="lg" disabled={loading} className="fw-bold">
                      {loading ? 'Envoi en cours...' : 'Envoyer le code'}
                    </Button>
                    <Button variant="light" onClick={() => { setMode('login'); setError(''); setMessage(''); }} disabled={loading}>
                      Retour
                    </Button>
                  </div>
                </Form>
              )}

              {mode === 'reset' && (
                <Form onSubmit={handleResetPassword}>
                  <p className="text-muted small mb-3">Saisissez le code à 6 chiffres reçu par e-mail ainsi que votre nouveau mot de passe.</p>
                  <CustomInput label="Code de vérification" icon="fa-key" type="text" placeholder="123456" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required maxLength="6" />
                  <CustomInput label="Nouveau mot de passe" icon="fa-lock" type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="6" className="mb-4" />

                  <div className="d-grid gap-2">
                    <Button variant="success" type="submit" size="lg" disabled={loading} className="fw-bold">
                      {loading ? 'Validation...' : 'Réinitialiser le mot de passe'}
                    </Button>
                    <Button variant="light" onClick={() => { setMode('login'); setError(''); setMessage(''); }} disabled={loading}>
                      Retour
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Container>

        {/* ── Footer ── */}
        <div className="login-footer">
          © {new Date().getFullYear()} Pharmacie Centrale de Tunisie.<br/>Plateforme Analytique.
        </div>
      </div>
    </div>
  );
};

export default Login;
