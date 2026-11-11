import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <nav className="navbar navbar-expand-lg sticky-top" style={{ backgroundColor: '#004b8d' }}>
            <div className="container">
                <a className="navbar-brand text-white fw-bold" href="#">APOLLO <span style={{color: '#ef7d00'}}>ACTIVE</span></a>
                <div className="d-flex align-items-center">
                    <span className="text-white me-3">Hi, {user?.username}</span>
                    <button className="btn btn-outline-light btn-sm" onClick={logout}>Đăng xuất</button>
                </div>
            </div>
        </nav>
    );
};
export default Navbar;