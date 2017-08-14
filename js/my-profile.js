
function showMyProfile() {

    var user = KiiUser.getCurrentUser();

    var htmlName = getHtmlName();
    var role = "{UserRole-" + user.get(UserAttribute.Role) + "}";
    role = translateContent(langDict, htmlName, role);

    setElementValue("register_display_name", toSafeString(user.getDisplayName()));
    setElementValue("register_login_name", toSafeString(user.getUsername()));
    setElementValue("register_phone", toSafeString(user.getPhoneNumber()));
    setElementValue("register_mail", toSafeString(user.getEmailAddress()));
    setElementValue("register_role", toSafeString(role));

}
