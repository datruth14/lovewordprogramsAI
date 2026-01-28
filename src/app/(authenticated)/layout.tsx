import Header from '@/components/Header';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <main className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
                {children}
            </main>
        </>
    );
}
