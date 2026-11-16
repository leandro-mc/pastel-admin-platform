namespace Pastel.Modules.Huella.Domain;

/// <summary>Longitudes máximas de cada campo de texto, iguales a las columnas de la base. Los validadores las usan.</summary>
internal static class HuellaLimits
{
    public static class Profile
    {
        public const int DisplayName = 80;
        public const int Headline = 120;
        public const int Summary = 1200;
        public const int Location = 80;
        public const int Availability = 80;
        public const int ContactEmail = 254;
        public const int ContactPhone = 32;
    }

    public static class ProfileLink
    {
        public const int Kind = 24;
        public const int Icon = 24;
        public const int Label = 60;
        public const int Url = 2048;
    }

    public static class PrivateNote
    {
        public const int Story = 6000;
        public const int Voice = 1500;
        public const int Residence = 120;
        public const int WorkMode = 120;
        public const int Availability = 120;
        public const int WorkAuthorization = 160;
        public const int SalaryExpectation = 120;
        public const int Avoid = 1200;
        public const int PreferredPaper = 8;
        public const int ExtraBannedPhrases = 600;
    }

    public static class Experience
    {
        public const int Role = 120;
        public const int MarketRole = 120;
        public const int Company = 120;
        public const int Location = 80;
        public const int EmploymentType = 24;
        public const int WorkMode = 24;
        public const int Narrative = 8000;
        public const int CompanyContext = 240;
    }

    public static class Project
    {
        public const int Name = 120;
        public const int Url = 2048;
        public const int Summary = 3000;
        public const int Approach = 3000;
        public const int Stack = 480;
    }

    public static class Achievement
    {
        public const int RawText = 600;
        public const int Situation = 300;
        public const int Action = 300;
        public const int ResultValue = 40;
        public const int ResultUnit = 40;
        public const int ResultBaseline = 80;
        public const int ImpactType = 24;
        public const int ShortText = 110;
        public const int LongText = 170;
        public const int Source = 16;
        public const int Visibility = 8;
    }

    public static class Skill
    {
        public const int Name = 60;
        public const int NormalizedName = 60;
        public const int Aliases = 240;
        public const int Category = 40;
        public const int Why = 800;
    }

    public static class Competency
    {
        public const int Name = 80;
        public const int NormalizedName = 80;
        public const int Kind = 12;
        public const int Description = 300;
        public const int Evidence = 700;
    }

    public static class Education
    {
        public const int Degree = 160;
        public const int Institution = 160;
        public const int Note = 240;
    }

    public static class Certification
    {
        public const int Name = 160;
        public const int Issuer = 120;
        public const int CredentialUrl = 2048;
    }

    public static class LanguageSkill
    {
        public const int Language = 60;
        public const int Level = 12;
        public const int Evidence = 240;
    }

    public static class JobOffer
    {
        public const int Title = 160;
        public const int Company = 160;
        public const int SourceUrl = 2048;
        public const int RawText = 20000;
        public const int Notes = 1000;
    }

    public static class CvVersion
    {
        public const int Name = 120;
        public const int Level = 10;
        public const int Paper = 8;
        public const int Language = 2;
        public const int Mode = 10;
        public const int Format = 12;
        public const int Focus = 200;
        public const int Source = 24;
    }
}
