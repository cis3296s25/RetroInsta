import React from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { Home, Explore, AddCircle, Person } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";

const Footer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Paper 
      sx={{ position: "fixed", bottom: 0, left: 0, right: 0, width: "100%" }} 
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={location.pathname}
        onChange={(event, newValue) => navigate(newValue)}
      >
        <BottomNavigationAction label="Home" value="/" icon={<Home />} />
        <BottomNavigationAction label="Explore" value="/explore" icon={<Explore />} />
        <BottomNavigationAction label="Post" value="/post" icon={<AddCircle />} />
        <BottomNavigationAction label="Profile" value="/profile" icon={<Person />} />
      </BottomNavigation>
    </Paper>
  );
};

export default Footer;
